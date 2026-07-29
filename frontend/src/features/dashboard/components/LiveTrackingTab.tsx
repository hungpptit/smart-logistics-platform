import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CONFIG } from '../../../config';
import { io, Socket } from 'socket.io-client';
import {
  Navigation, Earth, Truck, MapPin, Search, RefreshCw,
  Play, Square, Clock, Loader2, AlertCircle, Bot, RotateCcw, Building2
} from 'lucide-react';
import { Map, MapControls, MapMarker, MarkerContent, MapRoute, MarkerPopup } from '../../../components/ui/map';
import MapLibreGL from 'maplibre-gl';
import { RouteOptimizationModal } from './RouteOptimizationModal';

interface Facility {
  id: string;
  facilityCode: string;
  facilityName: string;
}

interface RouteStop {
  id: string;
  stopType: 'PICKUP' | 'DELIVERY';
  sequence: number;
  addressSnapshot: string;
  latitude: number;
  longitude: number;
  status: 'PENDING' | 'ARRIVED' | 'DEPARTED' | 'COMPLETED' | 'FAILED';
}

interface RouteData {
  id: string;
  routeCode: string;
  status: 'PLANNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  plannedDistanceKm: number;
  plannedDurationMin: number;
  totalStops: number;
  startFacility: {
    facilityCode: string;
    facilityName: string;
    facilityAddresses?: Array<{
      isPrimary?: boolean;
      address?: {
        latitude?: number;
        longitude?: number;
        addressLine1?: string;
      };
    }>;
  };
  driverVehicleAssignment?: {
    driver?: {
      id: string;
      employeeCode?: string;
      fullName?: string;
      phone?: string;
      user?: {
        fullName: string;
        phone?: string;
      };
    };
    vehicle?: {
      vehicleCode?: string;
      licensePlate?: string;
    };
  };
  stops?: RouteStop[];
  currentGpsLocation?: {
    latitude: number;
    longitude: number;
    speedMps?: number | null;
    headingDegrees?: number | null;
    accuracyMeters?: number | null;
    recordedAt?: string;
  } | null;
}

export const LiveTrackingTab: React.FC = () => {
  const { token, user } = useAuth();

  // State
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);

  // Filters
  const [facilityFilter, setFacilityFilter] = useState<string>(user?.staffProfile?.assignedFacilityId || '');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.roles.includes('ADMIN');
  const isStaffOnly = user?.roles.includes('STAFF') && !user?.roles.includes('ADMIN');
  const userAssignedFacilityId = user?.staffProfile?.assignedFacilityId;
  const isAdminOrStaff = user?.roles.includes('ADMIN') || user?.roles.includes('STAFF');
  const canOperateOnCurrentFacility = isAdmin || (isStaffOnly && facilityFilter === userAssignedFacilityId);

  const handleRunAiOptimization = async () => {
    if (isStaffOnly && facilityFilter && facilityFilter !== userAssignedFacilityId) {
      alert('❌ Quyền hạn không đủ! Bạn chỉ được phép thực hiện gom cụm đơn hàng tại Bưu cục mình quản lý.');
      return;
    }

    setIsOptimizationModalOpen(true);
  };

  const [resetting, setResetting] = useState<boolean>(false);

  const handleDevResetAi = async () => {
    const targetFacilityId = facilityFilter || userAssignedFacilityId;

    if (!targetFacilityId && !isAdmin) {
      alert('Vui lòng chọn Kho/Bưu cục cần hoàn tác dữ liệu AI!');
      return;
    }

    if (!canOperateOnCurrentFacility && !isAdmin) {
      alert('❌ Quyền hạn không đủ! Bạn chỉ được phép hoàn tác dữ liệu AI tại Bưu cục mình quản lý.');
      return;
    }

    const targetFacName = targetFacilityId
      ? (facilities.find(f => f.id === targetFacilityId)?.facilityName || 'kho đang chọn')
      : 'TOÀN BỘ CÁC BƯU CỤC HỆ THỐNG';

    if (!window.confirm(`⚠️ [DEV RESET] Bạn có chắc muốn HOÀN TÁC tất cả các tuyến AI đã gom và trả lại các đơn hàng của ${targetFacName} về trạng thái chờ ban đầu?`)) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/routes/dev-reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ facilityId: targetFacilityId })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert(`🎉 ${data.message || 'Đã hoàn tác dữ liệu AI về ban đầu!'}`);
        setSelectedRouteId(null);
        setSelectedRoute(null);
        fetchRoutes();
      } else {
        alert(`❌ Lỗi hoàn tác: ${data.message || 'Không thể hoàn tác dữ liệu.'}`);
      }
    } catch (err) {
      console.error('Lỗi khi gọi API dev-reset:', err);
      alert('❌ Đã xảy ra lỗi kết nối khi hoàn tác.');
    } finally {
      setResetting(false);
    }
  };

  // Socket.io
  const socketRef = useRef<Socket | null>(null);
  const mapRef = useRef<MapLibreGL.Map | null>(null);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationIndex, setSimulationIndex] = useState<number>(0);
  const simIntervalRef = useRef<any>(null);

  // Parse Socket Host
  const getSocketUrl = () => {
    const apiBase = CONFIG.API_BASE_URL;
    return apiBase.replace('/api/v1', '');
  };

  // Fetch facilities list for filtering
  const fetchFacilities = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/facilities?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setFacilities(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching facilities:', err);
    }
  };

  // Fetch routes
  const fetchRoutes = async (selectedIdToKeep?: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (facilityFilter) queryParams.append('facilityId', facilityFilter);
      if (statusFilter) queryParams.append('status', statusFilter);

      const response = await fetch(`${CONFIG.API_BASE_URL}/routes?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const fetchedRoutes = data.data || [];
        setRoutes(fetchedRoutes);

        // Auto-select first route if none selected
        if (fetchedRoutes.length > 0 && !selectedIdToKeep) {
          handleSelectRoute(fetchedRoutes[0].id);
        } else if (selectedIdToKeep) {
          // Refresh details of the currently selected route
          const stillExists = fetchedRoutes.find((r: any) => r.id === selectedIdToKeep);
          if (stillExists) {
            handleSelectRoute(selectedIdToKeep);
          }
        }
      } else {
        setError(data.message || 'Không thể tải danh sách lộ trình.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu lộ trình.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch details of a single route (includes stops & real-time Redis coordinates)
  const handleSelectRoute = async (routeId: string) => {
    if (!token) return;
    setSelectedRouteId(routeId);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/routes/${routeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSelectedRoute(data.data);
      }
    } catch (err) {
      console.error('Error fetching route detail:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchFacilities();
    fetchRoutes();
  }, []);

  // Sync refetch on filter change
  useEffect(() => {
    fetchRoutes();
  }, [facilityFilter, statusFilter]);

  // Establish Socket.io connection & join channels
  useEffect(() => {
    const socketUrl = getSocketUrl();
    console.log(`[Socket] Connecting to server at: ${socketUrl}`);
    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to real-time tracking gateway. ID:', socket.id);
      socket.emit('join:admin');
    });

    // Listen for live location updates from drivers
    socket.on('driver:location_changed', (data: {
      routeId: string;
      latitude: number;
      longitude: number;
      speedMps?: number | null;
      headingDegrees?: number | null;
      accuracyMeters?: number | null;
      recordedAt?: string;
    }) => {
      console.log('[Socket] Live GPS update received:', data);

      // 1. Update the coordinate in the general route list
      setRoutes(prevRoutes =>
        prevRoutes.map(route => {
          if (route.id === data.routeId) {
            return {
              ...route,
              currentGpsLocation: {
                latitude: data.latitude,
                longitude: data.longitude,
                speedMps: data.speedMps,
                headingDegrees: data.headingDegrees,
                accuracyMeters: data.accuracyMeters,
                recordedAt: data.recordedAt
              }
            };
          }
          return route;
        })
      );

      // 2. If it's the currently selected route, update its detail coordinates
      setSelectedRoute(prevSelected => {
        if (prevSelected && prevSelected.id === data.routeId) {
          return {
            ...prevSelected,
            currentGpsLocation: {
              latitude: data.latitude,
              longitude: data.longitude,
              speedMps: data.speedMps,
              headingDegrees: data.headingDegrees,
              accuracyMeters: data.accuracyMeters,
              recordedAt: data.recordedAt
            }
          };
        }
        return prevSelected;
      });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from gateway');
    });

    return () => {
      if (socket) {
        socket.emit('leave:admin');
        socket.disconnect();
      }
    };
  }, [token]);

  // Clean up simulation on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  // Fetch OSRM Route Geometry and Autofit bounds when selected route changes
  useEffect(() => {
    const map = mapRef.current;
    if (!selectedRoute) {
      setRouteGeometry([]);
      return;
    }

    const coords: [number, number][] = [];
    const startLat = selectedRoute.stops?.[0]?.latitude || 10.762622;
    const startLng = selectedRoute.stops?.[0]?.longitude || 106.660172;
    coords.push([startLng, startLat]);

    selectedRoute.stops?.forEach(stop => {
      coords.push([stop.longitude, stop.latitude]);
    });

    const fetchOSRMRoute = async () => {
      try {
        /*
        // --- GOONG MAPS DIRECTION INTEGRATION (UNCOMMENT TO SWITCH FROM OSRM TO GOONG) ---
        // const goongApiKey = import.meta.env.VITE_GOONG_API_KEY || import.meta.env.VITE_GOONG_MAP_KEY;
        // const origin = `${coords[0][1]},${coords[0][0]}`;
        // const destination = `${coords[coords.length - 1][1]},${coords[coords.length - 1][0]}`;
        // const waypoints = coords.slice(1, -1).map(c => `${c[1]},${c[0]}`).join('|');
        // const url = `https://rsapi.goong.io/Direction?origin=${origin}&destination=${destination}&waypoints=${waypoints}&api_key=${goongApiKey}`;
        // const res = await fetch(url);
        // const data = await res.json();
        // if (data.routes && data.routes.length > 0) {
        //   // Decode Google Polyline format returned by Goong API
        //   // Note: You can implement a simple decode function or install @mapbox/polyline
        //   // const decodePolyline = (str: string) => { ... };
        //   // const routeCoords = decodePolyline(data.routes[0].overview_polyline.points);
        //   // setRouteGeometry(routeCoords);
        //   // return;
        // }
        // ---------------------------------------------------------------------------------
        */

        const coordsString = coords.map(c => `${c[0]},${c[1]}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const routeCoords = data.routes[0].geometry.coordinates as [number, number][];
          setRouteGeometry(routeCoords);

          // Fit bounds to OSRM geometry coordinates
          if (map && routeCoords.length > 0) {
            const lons = routeCoords.map(c => c[0]);
            const lats = routeCoords.map(c => c[1]);
            const minLon = Math.min(...lons);
            const maxLon = Math.max(...lons);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            map.fitBounds([minLon, minLat, maxLon, maxLat], {
              padding: { top: 80, bottom: 80, left: 80, right: 80 },
              duration: 1000,
            });
          }
        } else {
          // Fallback to straight lines
          setRouteGeometry(coords);
          fitCoords(coords);
        }
      } catch (err) {
        console.error('Failed to fetch OSRM route:', err);
        setRouteGeometry(coords); // Fallback
        fitCoords(coords);
      }
    };

    const fitCoords = (cList: [number, number][]) => {
      if (!map || cList.length === 0) return;
      const lons = cList.map(c => c[0]);
      const lats = cList.map(c => c[1]);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      map.fitBounds([minLon, minLat, maxLon, maxLat], {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 1000,
      });
    };

    fetchOSRMRoute();
  }, [selectedRoute?.id]);

  // Simulation implementation
  const handleToggleSimulation = () => {
    if (isSimulating) {
      // Stop Simulation
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      setIsSimulating(false);
      setSimulationIndex(0);
      return;
    }

    if (!selectedRoute || !selectedRoute.stops || selectedRoute.stops.length === 0) {
      alert('Không có thông tin điểm dừng để mô phỏng.');
      return;
    }

    // Start Simulation
    setIsSimulating(true);
    setSimulationIndex(0);

    // Generate route coordinate steps
    const steps: { lat: number; lng: number }[] = [];

    if (routeGeometry && routeGeometry.length > 0) {
      // Use OSRM road coordinates
      // Downsample to keep the simulation speed reasonable (max 45 steps)
      const maxSteps = 45;
      if (routeGeometry.length > maxSteps) {
        const factor = Math.ceil(routeGeometry.length / maxSteps);
        for (let i = 0; i < routeGeometry.length; i += factor) {
          steps.push({
            lng: routeGeometry[i][0],
            lat: routeGeometry[i][1]
          });
        }
        // Ensure last coordinate is included
        const lastCoord = routeGeometry[routeGeometry.length - 1];
        if (steps[steps.length - 1].lng !== lastCoord[0] || steps[steps.length - 1].lat !== lastCoord[1]) {
          steps.push({
            lng: lastCoord[0],
            lat: lastCoord[1]
          });
        }
      } else {
        routeGeometry.forEach(coord => {
          steps.push({
            lng: coord[0],
            lat: coord[1]
          });
        });
      }
    } else {
      // Straight-line fallback
      const stopsList = selectedRoute.stops;
      let currentLat = 10.762622;
      let currentLng = 106.660172;

      stopsList.forEach((stop) => {
        const nextLat = stop.latitude;
        const nextLng = stop.longitude;

        for (let i = 0; i < 5; i++) {
          const ratio = i / 5;
          steps.push({
            lat: currentLat + (nextLat - currentLat) * ratio,
            lng: currentLng + (nextLng - currentLng) * ratio
          });
        }
        steps.push({
          lat: nextLat,
          lng: nextLng
        });
        currentLat = nextLat;
        currentLng = nextLng;
      });
    }

    let currentStepIndex = 0;

    simIntervalRef.current = setInterval(() => {
      if (currentStepIndex >= steps.length) {
        // Loop back or stop
        clearInterval(simIntervalRef.current!);
        simIntervalRef.current = null;
        setIsSimulating(false);
        setSimulationIndex(0);
        return;
      }

      const point = steps[currentStepIndex];
      setSimulationIndex(currentStepIndex);

      // Emit simulated GPS location through Socket
      if (socketRef.current && socketRef.current.connected) {
        const mockData = {
          routeId: selectedRoute.id,
          latitude: point.lat,
          longitude: point.lng,
          speedMps: 8.5 + Math.random() * 4,
          headingDegrees: Math.floor(Math.random() * 360),
          accuracyMeters: 4.5
        };
        console.log('[Simulate] Emitting location update:', mockData);
        socketRef.current.emit('driver:update_location', mockData);
      }

      currentStepIndex++;
    }, 3000); // Emits update every 3 seconds to keep it active
  };

  // Helper to extract driver name safely from either direct property or nested user property
  const getDriverName = (driverObj?: any) => {
    if (!driverObj) return '';
    return driverObj.user?.fullName || driverObj.fullName || '';
  };

  // Filters routes locally based on search query
  const filteredRoutes = routes.filter(route => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const driverName = getDriverName(route.driverVehicleAssignment?.driver);

    return (
      route.routeCode.toLowerCase().includes(term) ||
      driverName.toLowerCase().includes(term) ||
      (route.driverVehicleAssignment?.vehicle?.licensePlate || '').toLowerCase().includes(term) ||
      route.startFacility.facilityName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-4 font-montserrat">

      {/* 1. LEFT SIDEBAR: Routes list and Filters */}
      <div className="w-full lg:w-96 bg-white rounded-lg border border-[#e2e8f0] shadow-soft flex flex-col h-full overflow-hidden shrink-0">

        {/* Header and Search */}
        <div className="p-4 border-b border-[#e2e8f0] bg-gray-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800 flex items-center gap-2">
              <Earth size={16} className="text-[#bc0100] animate-pulse" />
              <span>Định vị thời gian thực</span>
            </h3>
            <div className="flex items-center gap-1.5">
              {isStaffOnly && facilityFilter !== userAssignedFacilityId && (
                <span className="text-[9px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold" title="Nhân viên chỉ có quyền xem thông tin kho khác. Thao tác gom cụm bị khóa.">
                  🔒 Chỉ xem
                </span>
              )}

              {isAdminOrStaff && canOperateOnCurrentFacility && (
                <>
                  <button
                    onClick={handleRunAiOptimization}
                    disabled={resetting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                    title="Kích hoạt thuật toán AI K-Means & VRP gom cụm phân đơn cho tài xế"
                  >
                    <Bot size={12} />
                    <span>🤖 AI Gom Cụm</span>
                  </button>

                  <button
                    onClick={handleDevResetAi}
                    disabled={resetting}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                    title="[DEV TOOL] Hoàn tác toàn bộ lộ trình AI và khôi phục 80 đơn hàng về trạng thái ban đầu để test AI tiếp"
                  >
                    <RotateCcw size={12} className={resetting ? 'animate-spin' : ''} />
                    <span>{resetting ? 'Đang reset...' : '↺ Hoàn tác AI (DEV)'}</span>
                  </button>
                </>
              )}
              <button
                onClick={() => fetchRoutes(selectedRouteId || undefined)}
                className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                title="Làm mới"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold rounded flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm mã lộ trình, tài xế, bưu cục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-2 border border-[#e2e8f0] rounded text-xs focus:border-[#bc0100] outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="px-2 py-1.5 border border-[#e2e8f0] rounded text-[10px] font-bold outline-none bg-white text-gray-600"
            >
              <option value="">Tất cả bưu cục</option>
              {facilities.map(fac => (
                <option key={fac.id} value={fac.id}>{fac.facilityName}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 border border-[#e2e8f0] rounded text-[10px] font-bold outline-none bg-white text-gray-600"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PLANNED">Đã lên kế hoạch</option>
              <option value="ASSIGNED">Đã phân bổ</option>
              <option value="IN_PROGRESS">Đang di chuyển</option>
              <option value="COMPLETED">Đã hoàn thành</option>
            </select>
          </div>
        </div>

        {/* Routes list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#e2e8f0]">
          {loading && routes.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center gap-2 text-gray-400">
              <Loader2 className="animate-spin text-[#bc0100]" size={24} />
              <span className="text-[10px] uppercase font-bold tracking-wider">Đang tải lộ trình...</span>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <span className="text-xs">Không tìm thấy lộ trình phù hợp</span>
            </div>
          ) : (
            filteredRoutes.map((route) => {
              const isSelected = selectedRouteId === route.id;
              const isOnline = !!route.currentGpsLocation;

              return (
                <div
                  key={route.id}
                  onClick={() => handleSelectRoute(route.id)}
                  className={`p-4 cursor-pointer transition-all border-l-4 ${isSelected
                      ? 'bg-[#bc0100]/5 border-[#bc0100]'
                      : 'border-transparent hover:bg-gray-50/50'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-xs">{route.routeCode}</span>
                        {isOnline && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                        Tài xế: <span className="font-semibold text-gray-700">{getDriverName(route.driverVehicleAssignment?.driver) || 'Chưa gán'}</span>
                      </p>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${route.status === 'IN_PROGRESS'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : route.status === 'COMPLETED'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                      {route.status === 'IN_PROGRESS' ? 'Đang giao' : route.status === 'COMPLETED' ? 'Đã xong' : 'Chưa chạy'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 mt-3 text-[10px] text-gray-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Truck size={10} /> {route.driverVehicleAssignment?.vehicle?.licensePlate || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1 justify-end">
                      <Clock size={10} /> {route.plannedDurationMin} phút
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={10} /> {route.totalStops} điểm dừng
                    </span>
                    <span className="flex items-center gap-1 justify-end">
                      <Navigation size={10} /> {Number(route.plannedDistanceKm).toFixed(1)} km
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. RIGHT SIDE: Real-time map & Route Details */}
      <div className="flex-1 bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden flex flex-col relative h-full">

        {/* Map Container */}
        <div className="flex-1 relative">
          {(() => {
            const primaryDepotAddr = selectedRoute?.startFacility?.facilityAddresses?.find((fa) => fa.isPrimary)?.address || selectedRoute?.startFacility?.facilityAddresses?.[0]?.address;
            const depotLat = primaryDepotAddr?.latitude || (selectedRoute?.stops?.[0] ? selectedRoute.stops[0].latitude - 0.003 : 10.762622);
            const depotLng = primaryDepotAddr?.longitude || (selectedRoute?.stops?.[0] ? selectedRoute.stops[0].longitude - 0.003 : 106.660172);

            return (
              <Map
                ref={(instance) => {
                  if (instance) mapRef.current = instance;
                }}
                center={[depotLng, depotLat]}
                zoom={12}
                className="w-full h-full"
              >
                {/* Draw Route Polyline */}
                {routeGeometry.length > 0 && (
                  <MapRoute
                    coordinates={routeGeometry}
                    color="#bc0100"
                    width={4}
                    opacity={0.8}
                    dashArray={[2, 2]}
                  />
                )}

                {/* Depot Start Marker (Nổi bật Vị Trí Kho Rõ Ràng) */}
                <MapMarker longitude={depotLng} latitude={depotLat}>
                  <MarkerContent>
                    <div className="relative group flex items-center justify-center cursor-pointer">
                      <span className="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-indigo-500 opacity-75"></span>
                      <div className="relative flex items-center gap-1.5 bg-slate-900 text-amber-300 border-2 border-amber-400 px-2.5 py-1 rounded-full shadow-xl font-extrabold text-[10px] uppercase tracking-wider">
                        <Building2 size={14} className="text-amber-400 animate-pulse shrink-0" />
                        <span>🏠 KHO: {selectedRoute?.startFacility?.facilityCode || 'GỐC'}</span>
                      </div>
                    </div>
                  </MarkerContent>
                  <MarkerPopup closeButton={false}>
                    <div className="p-2 text-[11px] max-w-[200px]">
                      <div className="font-extrabold text-indigo-700 flex items-center gap-1 mb-1">
                        <Building2 size={14} />
                        <span>{selectedRoute?.startFacility?.facilityName || 'Kho trung tâm chính'}</span>
                      </div>
                      <p className="text-slate-600 text-[10px]">
                        Mã bưu cục: <span className="font-bold text-slate-800">{selectedRoute?.startFacility?.facilityCode || 'N/A'}</span>
                      </p>
                      <p className="text-slate-500 text-[9px] mt-1 italic border-t border-slate-100 pt-1">
                        📍 {primaryDepotAddr?.addressLine1 || 'Điểm xuất phát & điểm kết thúc của lộ trình (VRP)'}
                      </p>
                    </div>
                  </MarkerPopup>
                </MapMarker>

                {/* Stops Markers */}
                {selectedRoute?.stops?.map((stop) => (
                  <MapMarker key={stop.id} longitude={stop.longitude} latitude={stop.latitude}>
                    <MarkerContent>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-md ${stop.status === 'COMPLETED' ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                        {stop.sequence}
                      </div>
                    </MarkerContent>
                    <MarkerPopup closeButton={false}>
                      <div className="p-1 text-[10px] max-w-[180px]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800">Điểm dừng {stop.sequence}</span>
                          <span className={`px-1 rounded text-[8px] ${stop.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>{stop.status}</span>
                        </div>
                        <p className="text-slate-500 truncate">{stop.addressSnapshot}</p>
                      </div>
                    </MarkerPopup>
                  </MapMarker>
                ))}

                {/* Live Driver Markers (Nổi bật vị trí xe tài xế đang phát GPS thời gian thực) */}
                {routes.filter(r => r.currentGpsLocation).map(r => (
                  <MapMarker
                    key={`driver-${r.id}`}
                    longitude={r.currentGpsLocation!.longitude}
                    latitude={r.currentGpsLocation!.latitude}
                  >
                    <MarkerContent>
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-500 bg-slate-900 shadow-lg animate-bounce cursor-pointer">
                        <Truck className="h-5 w-5 text-white" />
                        <span className="absolute -inset-1 animate-ping rounded-full border-2 border-green-400/40 opacity-75"></span>
                      </div>
                    </MarkerContent>
                    <MarkerPopup closeButton={false}>
                      <div className="p-2 text-xs font-sans max-w-[200px]">
                        <h4 className="font-bold text-slate-800">{getDriverName(r.driverVehicleAssignment?.driver) || 'Tài xế'}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{r.routeCode}</p>
                        <div className="mt-2 space-y-1 text-slate-600">
                          <p>Vận tốc: <span className="font-bold text-slate-800">
                            {r.currentGpsLocation!.speedMps
                              ? `${Math.round(r.currentGpsLocation!.speedMps * 3.6)} km/h`
                              : 'Đang dừng'}
                          </span></p>
                          <p>Tọa độ: <span className="font-mono">{r.currentGpsLocation!.latitude.toFixed(5)}, {r.currentGpsLocation!.longitude.toFixed(5)}</span></p>
                          <p className="text-[9px] text-gray-400 italic">Cập nhật: {r.currentGpsLocation!.recordedAt ? new Date(r.currentGpsLocation!.recordedAt).toLocaleTimeString('vi-VN') : 'Vừa xong'}</p>
                        </div>
                      </div>
                    </MarkerPopup>
                  </MapMarker>
                ))}

                <MapControls showZoom showCompass showFullscreen className="bottom-4 right-4" />
              </Map>
            );
          })()}

          {/* Quick Simulation Controller overlay */}
          {selectedRoute && selectedRoute.status !== 'COMPLETED' && (
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md p-4 rounded-lg border border-[#e2e8f0] shadow-md z-10 max-w-xs space-y-3">
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Trình mô phỏng GPS</span>
                <h4 className="text-xs font-bold text-gray-800">{selectedRoute.routeCode}</h4>
              </div>

              <p className="text-[10px] text-gray-500">
                Mô phỏng tín hiệu phát tọa độ GPS từ điện thoại di động tài xế lên hệ thống Socket.io & Redis.
              </p>

              <button
                onClick={handleToggleSimulation}
                className={`w-full py-2 px-4 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer ${isSimulating
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-[#bc0100] hover:bg-[#a00100] text-white shadow-sm'
                  }`}
              >
                {isSimulating ? (
                  <>
                    <Square size={12} fill="white" />
                    <span>Dừng mô phỏng</span>
                  </>
                ) : (
                  <>
                    <Play size={12} fill="white" />
                    <span>Bắt đầu mô phỏng</span>
                  </>
                )}
              </button>

              {isSimulating && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[10px] text-green-600 font-semibold animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                    <span>Đang truyền tín hiệu định vị...</span>
                  </div>
                  <span className="text-[9px] text-gray-400">Bước mô phỏng: {simulationIndex}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Route Info Footer Panel */}
        {selectedRoute && (
          <div className="bg-slate-50 border-t border-[#e2e8f0] p-4 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase">Tài xế giao vận</span>
                <p className="font-bold text-gray-800">{getDriverName(selectedRoute.driverVehicleAssignment?.driver) || 'Chưa gán'}</p>
              </div>
              <div className="border-l border-gray-200 pl-4">
                <span className="text-[9px] font-bold text-gray-400 uppercase">Phương tiện gán</span>
                <p className="font-semibold text-gray-700">{selectedRoute.driverVehicleAssignment?.vehicle?.licensePlate || 'N/A'}</p>
              </div>
              <div className="border-l border-gray-200 pl-4">
                <span className="text-[9px] font-bold text-gray-400 uppercase">Điểm xuất phát</span>
                <p className="font-semibold text-gray-700">{selectedRoute.startFacility.facilityName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[9px] font-bold text-gray-400 uppercase">Trạng thái định vị</span>
                <p className={`font-bold uppercase ${selectedRoute.currentGpsLocation ? 'text-green-600' : 'text-gray-400'}`}>
                  {selectedRoute.currentGpsLocation ? 'Tín hiệu tốt' : 'Ngoại tuyến'}
                </p>
              </div>
              {selectedRoute.currentGpsLocation?.speedMps !== undefined && (
                <div className="bg-white border border-[#e2e8f0] rounded-full h-10 w-10 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[8px] text-gray-400 font-extrabold -mb-0.5">KM/H</span>
                  <span className="font-bold text-gray-800 text-xs">
                    {Math.round((selectedRoute.currentGpsLocation.speedMps || 0) * 3.6)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <RouteOptimizationModal
        isOpen={isOptimizationModalOpen}
        onClose={() => setIsOptimizationModalOpen(false)}
        onSuccess={() => {
          setIsOptimizationModalOpen(false);
          fetchRoutes();
        }}
        token={token}
        facilityId={facilityFilter || userAssignedFacilityId}
        facilities={facilities}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default LiveTrackingTab;
