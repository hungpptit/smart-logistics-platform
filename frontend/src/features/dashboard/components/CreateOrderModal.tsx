import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Package, MapPin, Truck, User, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, HelpCircle, ShieldCheck, BookMarked, Plus, Pencil } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { AddressModal } from './customer/AddressModal';
import { CONFIG } from '../../../config';
import { geocodeAddress } from '../../../lib/geocoding';
import { Map, MapMarker, MarkerContent, MapControls } from '../../../components/ui/map';
import { AddressFormFields } from '../../../components/ui/AddressFormFields';
import { useMapConfirmation } from '../../../hooks/useMapConfirmation';
import { formatCurrency } from '../../../lib/utils';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  isAdminOrStaff: boolean;
}

// Regex format kiểm tra Số điện thoại hợp lệ (bắt đầu bằng 0 hoặc +84, gồm 10-11 chữ số)
const VIETNAM_PHONE_REGEX = /^(0|\+84)[0-9]{9,10}$/;

// Hàm làm sạch chuỗi đầu vào chống mã độc HTML / XSS Injection
const sanitizeInput = (inputStr: string): string => {
  if (!inputStr) return '';
  return inputStr
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');
};

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
  isAdminOrStaff,
}) => {
  // Step Wizard State (1: Sender, 2: Receiver, 3: Package, 4: Service & Payment)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Validation & Red Border Errors State
  const [showErrors, setShowErrors] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});

  // Confirmation & Notification Modal Popups State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [notificationState, setNotificationState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { user } = useAuth();

  // Form States
  const [customerId, setCustomerId] = useState('');
  const [serviceCode, setServiceCode] = useState('STANDARD');
  const [feePayer, setFeePayer] = useState<'SENDER' | 'RECEIVER'>('SENDER');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'E_WALLET' | 'COD'>('CASH');
  const [codAmount, setCodAmount] = useState<number>(0);
  const [pickupType, setPickupType] = useState<'PICKUP' | 'DROP_OFF'>('PICKUP');

  // Saved Addresses Quick Selector States (Shopee Style)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
  const [selectedSenderAddressId, setSelectedSenderAddressId] = useState<string | null>(null);

  const applySavedAddressToSender = (item: any) => {
    setSelectedSenderAddressId(item.addressId || item.id);
    const addr = item.address || item;
    const wardCode = addr.wardCode || addr.wardRelation?.code || '';
    const provinceCode = addr.wardRelation?.provinceCode || addr.wardRelation?.province?.code || addr.provinceCode || '';
    const wardName = addr.wardRelation?.fullName || addr.wardRelation?.name || addr.wardName || '';
    const provinceName = addr.wardRelation?.province?.fullName || addr.wardRelation?.province?.name || addr.provinceName || '';

    let cleanedAddressLine1 = addr.addressLine1 || '';
    if (wardName) {
      cleanedAddressLine1 = cleanedAddressLine1.replace(new RegExp(`,\\s*${wardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '');
    }
    if (provinceName) {
      cleanedAddressLine1 = cleanedAddressLine1.replace(new RegExp(`,\\s*${provinceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '');
    }

    setSenderName(item.contactName || (user?.customerProfile?.fullName || user?.username || ''));
    setSenderPhone(item.contactPhone || (user?.customerProfile?.phone || user?.phone || ''));
    setSenderProvince(provinceName);
    setSenderProvinceCode(provinceCode);
    setSenderWard(wardName);
    setSenderWardCode(wardCode);
    setSenderAddressLine1(cleanedAddressLine1.trim());

    if (addr.latitude && addr.longitude) {
      setSenderLatitude(addr.latitude);
      setSenderLongitude(addr.longitude);
      setSenderTempLat(addr.latitude);
      setSenderTempLng(addr.longitude);
      setSenderMapCenter([addr.longitude, addr.latitude]);
      if (senderMapRef.current) {
        try {
          senderMapRef.current.flyTo({ center: [addr.longitude, addr.latitude], zoom: 15 });
        } catch (e) { }
      }
    }
  };



  const fetchCustomerAddresses = async () => {
    setLoadingSavedAddresses(true);
    try {
      const url = isAdminOrStaff && customerId
        ? `${CONFIG.API_BASE_URL}/customers/${customerId}/addresses`
        : `${CONFIG.API_BASE_URL}/customers/me/addresses`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setSavedAddresses(data.data);
        return data.data;
      }
    } catch (err) {
      console.error('Error fetching customer addresses for order modal:', err);
    } finally {
      setLoadingSavedAddresses(false);
    }
    return [];
  };

  useEffect(() => {
    if (!isOpen || !token) return;

    fetchCustomerAddresses().then((dataList) => {
      if (Array.isArray(dataList) && dataList.length > 0) {
        const defaultAddr = dataList.find((item: any) => item.isDefault) || dataList[0];
        if (defaultAddr && !senderAddressLine1 && !senderName) {
          applySavedAddressToSender(defaultAddr);
        }
      }
    });
  }, [isOpen, token, customerId, isAdminOrStaff]);

  // AddressModal State (from Profile)
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isEditingAddressModal, setIsEditingAddressModal] = useState(false);
  const [addressModalActionLoading, setAddressModalActionLoading] = useState(false);
  const [addressModalTarget, setAddressModalTarget] = useState<'sender' | 'receiver'>('sender');

  const initialAddressModalForm = {
    id: '',
    addressLine1: '',
    addressLine2: '',
    ward: '',
    province: '',
    provinceCode: '',
    wardCode: '',
    country: 'Vietnam',
    latitude: 10.8231,
    longitude: 106.6297,
    addressType: 'HOME' as const,
    isDefault: false,
    contactName: '',
    contactPhone: '',
  };

  const [addressModalFormData, setAddressModalFormData] = useState(initialAddressModalForm);

  const handleOpenAddAddressModal = (target: 'sender' | 'receiver') => {
    setAddressModalTarget(target);
    setIsEditingAddressModal(false);
    setAddressModalFormData({
      ...initialAddressModalForm,
      contactName: (user as any)?.fullName || user?.customerProfile?.fullName || user?.username || '',
      contactPhone: user?.phone || user?.customerProfile?.phone || '',
    });
    setShowAddressModal(true);
  };

  const handleOpenEditAddressModal = (item: any, target: 'sender' | 'receiver', e: React.MouseEvent) => {
    e.stopPropagation();
    setAddressModalTarget(target);
    const addr = item.address || item;
    const wardCode = addr.wardCode || addr.wardRelation?.code || '';
    const provinceCode = addr.wardRelation?.provinceCode || addr.wardRelation?.province?.code || addr.provinceCode || '';
    const wardName = addr.wardRelation?.fullName || addr.wardRelation?.name || addr.wardName || '';
    const provinceName = addr.wardRelation?.province?.fullName || addr.wardRelation?.province?.name || addr.provinceName || '';

    let cleanedAddressLine1 = addr.addressLine1 || '';
    if (wardName) {
      cleanedAddressLine1 = cleanedAddressLine1.replace(new RegExp(`,\\s*${wardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '');
    }
    if (provinceName) {
      cleanedAddressLine1 = cleanedAddressLine1.replace(new RegExp(`,\\s*${provinceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '');
    }

    setIsEditingAddressModal(true);
    setAddressModalFormData({
      id: item.addressId || addr.id || item.id,
      addressLine1: cleanedAddressLine1.trim(),
      addressLine2: addr.addressLine2 || '',
      ward: wardName,
      province: provinceName,
      provinceCode: provinceCode,
      wardCode: wardCode,
      country: addr.country || 'Vietnam',
      latitude: addr.latitude || 10.8231,
      longitude: addr.longitude || 106.6297,
      addressType: item.addressType || 'HOME',
      isDefault: item.isDefault || false,
      contactName: item.contactName || '',
      contactPhone: item.contactPhone || '',
    });
    setShowAddressModal(true);
  };

  const handleSaveAddressFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const targetCustId = isAdminOrStaff && customerId ? customerId : user?.customerProfile?.id;
    setAddressModalActionLoading(true);

    try {
      let url = `${CONFIG.API_BASE_URL}/customers/me/addresses`;
      let method = 'POST';

      if (isEditingAddressModal && addressModalFormData.id) {
        url = `${CONFIG.API_BASE_URL}/customers/${targetCustId || 'me'}/addresses/${addressModalFormData.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressModalFormData),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setShowAddressModal(false);
        const updated = await fetchCustomerAddresses();
        const targetId = addressModalFormData.id || data.data?.addressId || data.data?.id;
        const matched = (updated || []).find((a: any) => (a.addressId || a.id) === targetId) || (updated || [])[0];
        if (matched) {
          if (addressModalTarget === 'sender') {
            applySavedAddressToSender(matched);
          } else {
            applySavedAddressToReceiver(matched);
          }
        }
      } else {
        alert(data.message || 'Lỗi khi lưu địa chỉ.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối tới máy chủ.');
    } finally {
      setAddressModalActionLoading(false);
    }
  };

  // Sender States
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddressLine1, setSenderAddressLine1] = useState('');
  const [senderWard, setSenderWard] = useState('');
  const [senderProvince, setSenderProvince] = useState('');
  const [senderProvinceCode, setSenderProvinceCode] = useState('');
  const [senderWardCode, setSenderWardCode] = useState('');

  // Sender Coordinates & Map States
  const [senderLatitude, setSenderLatitude] = useState<number>(0);
  const [senderLongitude, setSenderLongitude] = useState<number>(0);
  const [senderMapCenter, setSenderMapCenter] = useState<[number, number]>([105.8542, 21.0285]);
  const senderMapRef = useRef<any>(null);

  const {
    tempLatitude: senderTempLat,
    tempLongitude: senderTempLng,
    setTempLatitude: setSenderTempLat,
    setTempLongitude: setSenderTempLng,
    onMapClick: onSenderMapClick,
    onMarkerDragEnd: onSenderMarkerDragEnd,
  } = useMapConfirmation({
    latitude: senderLatitude,
    longitude: senderLongitude,
    onChange: (lat, lng) => {
      setSenderLatitude(lat);
      setSenderLongitude(lng);
    },
    mapRef: senderMapRef
  });

  // Receiver States & Map States
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddressLine1, setReceiverAddressLine1] = useState('');
  const [receiverWard, setReceiverWard] = useState('');
  const [receiverProvince, setReceiverProvince] = useState('');
  const [receiverProvinceCode, setReceiverProvinceCode] = useState('');
  const [receiverWardCode, setReceiverWardCode] = useState('');
  const [receiverLatitude, setReceiverLatitude] = useState<number>(0);
  const [receiverLongitude, setReceiverLongitude] = useState<number>(0);
  const [receiverMapCenter, setReceiverMapCenter] = useState<[number, number]>([105.8542, 21.0285]);
  const receiverMapRef = useRef<any>(null);

  const {
    tempLatitude: receiverTempLat,
    tempLongitude: receiverTempLng,
    setTempLatitude: setReceiverTempLat,
    setTempLongitude: setReceiverTempLng,
    onMapClick: onReceiverMapClick,
    onMarkerDragEnd: onReceiverMarkerDragEnd,
  } = useMapConfirmation({
    latitude: receiverLatitude,
    longitude: receiverLongitude,
    onChange: (lat, lng) => {
      setReceiverLatitude(lat);
      setReceiverLongitude(lng);
    },
    mapRef: receiverMapRef
  });

  // Reset coordinates and states on modal open/close
  useEffect(() => {
    if (isOpen) {
      setActiveStep(1);
      setShowErrors(false);
      setErrors({});
      setErrorMessages({});
      setShowConfirmModal(false);
      setNotificationState({ isOpen: false, type: 'success', title: '', message: '' });
      setSenderLatitude(0);
      setSenderLongitude(0);
      setReceiverLatitude(0);
      setReceiverLongitude(0);
      setSenderMapCenter([105.8542, 21.0285]);
      setReceiverMapCenter([105.8542, 21.0285]);

      if (senderMapRef.current) {
        setTimeout(() => senderMapRef.current.resize(), 300);
      }
      if (receiverMapRef.current) {
        setTimeout(() => receiverMapRef.current.resize(), 300);
      }
    } else {
      setActiveStep(1);
      setShowErrors(false);
      setErrors({});
      setErrorMessages({});
      setShowConfirmModal(false);
      setNotificationState({ isOpen: false, type: 'success', title: '', message: '' });
      setSenderName('');
      setSenderPhone('');
      setSenderAddressLine1('');
      setSenderWard('');
      setSenderProvince('');
      setSenderProvinceCode('');
      setSenderWardCode('');
      setReceiverName('');
      setReceiverPhone('');
      setReceiverAddressLine1('');
      setReceiverWard('');
      setReceiverProvince('');
      setReceiverProvinceCode('');
      setReceiverWardCode('');
      setDescription('');
      setDeclaredValue('');
      setPickupDateOption('TODAY');
      setPickupShiftOption('MORNING');
    }
  }, [isOpen]);

  const senderMapCallbackRef = useCallback((mapInstance: any) => {
    senderMapRef.current = mapInstance;
    if (!mapInstance) return;
    setTimeout(() => mapInstance.resize(), 300);
    mapInstance.on('click', onSenderMapClick);
  }, [onSenderMapClick]);

  const receiverMapCallbackRef = useCallback((mapInstance: any) => {
    receiverMapRef.current = mapInstance;
    if (!mapInstance) return;
    setTimeout(() => mapInstance.resize(), 300);
    mapInstance.on('click', onReceiverMapClick);
  }, [onReceiverMapClick]);



  // Helper to calculate distance in Km between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  // Auto-geocode sender address in background if coords are not manually confirmed
  useEffect(() => {
    if (senderLatitude !== 0 || !senderAddressLine1 || !senderWard || !senderProvince || !token) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const fullAddress = [senderAddressLine1, senderWard, senderProvince].filter(Boolean).join(', ');
        const coords = await geocodeAddress(fullAddress, token);
        if (coords) {
          const lat = parseFloat(coords.latitude.toFixed(6));
          const lng = parseFloat(coords.longitude.toFixed(6));
          setSenderLatitude(lat);
          setSenderLongitude(lng);
          setSenderTempLat(lat);
          setSenderTempLng(lng);
          setSenderMapCenter([lng, lat]);
        }
      } catch (err) {
        console.error('Error auto-geocoding sender address:', err);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [senderAddressLine1, senderWard, senderProvince, token, senderLatitude]);

  // Auto-geocode receiver address in background to get destination coordinates for fee calculation
  useEffect(() => {
    if (receiverLatitude !== 0 || !receiverAddressLine1 || !receiverWard || !receiverProvince || !token) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const fullAddress = [receiverAddressLine1, receiverWard, receiverProvince].filter(Boolean).join(', ');
        const coords = await geocodeAddress(fullAddress, token);
        if (coords) {
          const lat = parseFloat(coords.latitude.toFixed(6));
          const lng = parseFloat(coords.longitude.toFixed(6));
          setReceiverLatitude(lat);
          setReceiverLongitude(lng);
          setReceiverTempLat(lat);
          setReceiverTempLng(lng);
          setReceiverMapCenter([lng, lat]);
        }
      } catch (err) {
        console.error('Error auto-geocoding receiver address:', err);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [receiverAddressLine1, receiverWard, receiverProvince, token, receiverLatitude]);

  // Package States
  const [weight, setWeight] = useState<number>(1.0);
  const [length, setLength] = useState<number>(20);
  const [width, setWidth] = useState<number>(15);
  const [height, setHeight] = useState<number>(10);
  const [isFragile, setIsFragile] = useState(false);
  const [temperatureRequirement, setTemperatureRequirement] = useState('');
  const [description, setDescription] = useState('');
  const [declaredValue, setDeclaredValue] = useState<number | ''>('');

  // Fixed Pickup Time Slots (Morning: 10:30-12:00, Afternoon: 16:00-18:00)
  const [pickupDateOption, setPickupDateOption] = useState<'TODAY' | 'TOMORROW'>('TODAY');
  const [pickupShiftOption, setPickupShiftOption] = useState<'MORNING' | 'AFTERNOON'>('MORNING');

  // Fetch initial data (customers if admin, active services)
  useEffect(() => {
    if (!isOpen || !token) return;

    // Fetch services
    setLoadingServices(true);
    fetch(`${CONFIG.API_BASE_URL}/services`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const activeServices = data.data.filter((s: any) => s.isActive);
          setServices(activeServices);
          if (activeServices.length > 0) {
            setServiceCode(activeServices[0].serviceCode);
          }
        }
      })
      .catch(err => console.error('Error fetching services:', err))
      .finally(() => setLoadingServices(false));

    // Fetch customers if staff/admin
    if (isAdminOrStaff) {
      fetch(`${CONFIG.API_BASE_URL}/customers?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setCustomers(data.data || []);
            if (data.data.length > 0) {
              setCustomerId(data.data[0].id);
            }
          }
        })
        .catch(err => console.error('Error fetching customers:', err));
    }
  }, [isOpen, token, isAdminOrStaff]);

  if (!isOpen) return null;

  // Validate single step & return error flags + messages
  const validateSingleStep = (stepNumber: 1 | 2 | 3 | 4) => {
    const errs: Record<string, boolean> = {};
    const msgs: Record<string, string> = {};

    if (stepNumber === 1) {
      if (isAdminOrStaff && !customerId) {
        errs.customerId = true;
        msgs.customerId = 'Vui lòng chọn khách hàng thanh toán!';
      }
      if (!senderName.trim()) {
        errs.senderName = true;
        msgs.senderName = 'Vui lòng nhập họ tên người gửi!';
      }
      const cleanSenderPhone = senderPhone.replace(/[\s\.\-\(\)]/g, '');
      if (!cleanSenderPhone) {
        errs.senderPhone = true;
        msgs.senderPhone = 'Vui lòng nhập số điện thoại người gửi!';
      } else if (!VIETNAM_PHONE_REGEX.test(cleanSenderPhone)) {
        errs.senderPhone = true;
        msgs.senderPhone = 'Số điện thoại không hợp lệ! Vui lòng nhập SĐT gồm 10 chữ số (VD: 0901234567 hoặc 0120741289)';
      }
      if (!senderAddressLine1.trim()) {
        errs.senderAddressLine1 = true;
        msgs.senderAddressLine1 = 'Vui lòng nhập số nhà, tên đường!';
      }
      if (!senderProvinceCode || !senderProvince) {
        errs.senderProvince = true;
        msgs.senderProvince = 'Vui lòng chọn Tỉnh/TP!';
      }
      if (!senderWardCode || !senderWard) {
        errs.senderWard = true;
        msgs.senderWard = 'Vui lòng chọn Phường/Xã!';
      }
    } else if (stepNumber === 2) {
      if (!receiverName.trim()) {
        errs.receiverName = true;
        msgs.receiverName = 'Vui lòng nhập họ tên người nhận!';
      }
      const cleanReceiverPhone = receiverPhone.replace(/[\s\.\-\(\)]/g, '');
      if (!cleanReceiverPhone) {
        errs.receiverPhone = true;
        msgs.receiverPhone = 'Vui lòng nhập số điện thoại người nhận!';
      } else if (!VIETNAM_PHONE_REGEX.test(cleanReceiverPhone)) {
        errs.receiverPhone = true;
        msgs.receiverPhone = 'Số điện thoại không hợp lệ! Vui lòng nhập SĐT gồm 10 chữ số (VD: 0987654321 hoặc 0120741289)';
      }
      if (!receiverAddressLine1.trim()) {
        errs.receiverAddressLine1 = true;
        msgs.receiverAddressLine1 = 'Vui lòng nhập số nhà, tên đường!';
      }
      if (!receiverProvinceCode || !receiverProvince) {
        errs.receiverProvince = true;
        msgs.receiverProvince = 'Vui lòng chọn Tỉnh/TP!';
      }
      if (!receiverWardCode || !receiverWard) {
        errs.receiverWard = true;
        msgs.receiverWard = 'Vui lòng chọn Phường/Xã!';
      }
    } else if (stepNumber === 3) {
      if (!weight || weight <= 0 || isNaN(weight)) {
        errs.weight = true;
        msgs.weight = 'Trọng lượng phải lớn hơn 0 kg!';
      }
      if (!length || length <= 0 || isNaN(length)) {
        errs.length = true;
        msgs.length = 'Chiều dài phải lớn hơn 0 cm!';
      }
      if (!width || width <= 0 || isNaN(width)) {
        errs.width = true;
        msgs.width = 'Chiều rộng phải lớn hơn 0 cm!';
      }
      if (!height || height <= 0 || isNaN(height)) {
        errs.height = true;
        msgs.height = 'Chiều cao phải lớn hơn 0 cm!';
      }
    }

    return { isValid: Object.keys(errs).length === 0, errs, msgs };
  };

  // Find the earliest step with missing/invalid info across steps 1..4
  const checkAllStepsForErrors = () => {
    const accumulatedErrors: Record<string, boolean> = {};
    const accumulatedMsgs: Record<string, string> = {};
    let earliestInvalidStep: 1 | 2 | 3 | 4 | null = null;

    for (let s = 1; s <= 4; s++) {
      const { isValid, errs, msgs } = validateSingleStep(s as 1 | 2 | 3 | 4);
      if (!isValid) {
        Object.assign(accumulatedErrors, errs);
        Object.assign(accumulatedMsgs, msgs);
        if (!earliestInvalidStep) {
          earliestInvalidStep = s as 1 | 2 | 3 | 4;
        }
      }
    }

    return { earliestInvalidStep, accumulatedErrors, accumulatedMsgs };
  };

  // Unrestricted Tab Click Handler (User can preview ANY tab freely)
  const handleSelectTab = (targetStep: 1 | 2 | 3 | 4) => {
    setActiveStep(targetStep);
    if (targetStep === 1) setTimeout(() => senderMapRef.current?.resize(), 300);
    if (targetStep === 2) setTimeout(() => receiverMapRef.current?.resize(), 300);
  };

  const handleNextStep = () => {
    if (activeStep < 4) {
      const nextStep = (activeStep + 1) as 1 | 2 | 3 | 4;
      handleSelectTab(nextStep);
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      const prevStep = (activeStep - 1) as 1 | 2 | 3 | 4;
      handleSelectTab(prevStep);
    }
  };

  // Trigger Confirmation Modal from Tab 4 Button
  const handleOpenConfirmModal = () => {
    setShowErrors(true);
    const { earliestInvalidStep, accumulatedErrors, accumulatedMsgs } = checkAllStepsForErrors();
    setErrors(accumulatedErrors);
    setErrorMessages(accumulatedMsgs);

    if (earliestInvalidStep) {
      setActiveStep(earliestInvalidStep);
      if (earliestInvalidStep === 1) setTimeout(() => senderMapRef.current?.resize(), 300);
      if (earliestInvalidStep === 2) setTimeout(() => receiverMapRef.current?.resize(), 300);
      return;
    }

    setShowConfirmModal(true);
  };

  // Execute Submission API call after user confirms in Modal Popup
  const executeOrderSubmission = async () => {
    if (!token) return;
    setShowConfirmModal(false);
    setActionLoading(true);

    let scheduledPickupAt: string | undefined = undefined;
    if (pickupType === 'PICKUP') {
      const pickupDate = new Date();
      if (pickupDateOption === 'TOMORROW') {
        pickupDate.setDate(pickupDate.getDate() + 1);
      }
      if (pickupShiftOption === 'MORNING') {
        pickupDate.setHours(11, 0, 0, 0);
      } else {
        pickupDate.setHours(17, 0, 0, 0);
      }
      scheduledPickupAt = pickupDate.toISOString();
    }

    // Sanitize string inputs before constructing final API payload
    const sanitizedSenderName = sanitizeInput(senderName);
    const sanitizedSenderAddress = sanitizeInput(senderAddressLine1);
    const sanitizedReceiverName = sanitizeInput(receiverName);
    const sanitizedReceiverAddress = sanitizeInput(receiverAddressLine1);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedTempReq = sanitizeInput(temperatureRequirement);

    const payload = {
      customerId: isAdminOrStaff ? customerId : undefined,
      serviceCode,
      feePayer,
      paymentMethod,
      codAmount: Number(codAmount),
      pickupType,
      scheduledPickupAt,
      senderContact: {
        fullName: sanitizedSenderName,
        phone: senderPhone.replace(/[\s\.\-\(\)]/g, ''),
      },
      pickupAddress: {
        addressLine1: sanitizedSenderAddress,
        ward: senderWard,
        province: senderProvince,
        country: 'Vietnam',
        latitude: senderLatitude !== 0 ? senderLatitude : undefined,
        longitude: senderLongitude !== 0 ? senderLongitude : undefined,
        wardCode: senderWardCode || undefined,
      },
      receiverContact: {
        fullName: sanitizedReceiverName,
        phone: receiverPhone.replace(/[\s\.\-\(\)]/g, ''),
      },
      deliveryAddress: {
        addressLine1: sanitizedReceiverAddress,
        ward: receiverWard,
        province: receiverProvince,
        country: 'Vietnam',
        wardCode: receiverWardCode || undefined,
        latitude: receiverLatitude !== 0 ? receiverLatitude : undefined,
        longitude: receiverLongitude !== 0 ? receiverLongitude : undefined,
      },
      packages: [
        {
          weight: Number(weight),
          length: Number(length),
          width: Number(width),
          height: Number(height),
          isFragile,
          temperatureRequirement: sanitizedTempReq || undefined,
          description: sanitizedDescription || undefined,
          declaredValue: declaredValue !== '' ? Number(declaredValue) : undefined,
        }
      ]
    };

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setNotificationState({
          isOpen: true,
          type: 'success',
          title: 'TẠO ĐƠN HÀNG THÀNH CÔNG!',
          message: `Đơn hàng vận chuyển mã ${resData.data?.orderCode || ''} đã được tạo thành công trên hệ thống.`,
        });
      } else {
        setNotificationState({
          isOpen: true,
          type: 'error',
          title: 'KHÔNG THỂ TẠO ĐƠN HÀNG',
          message: resData.message || 'Có lỗi xảy ra trong quá trình xử lý đơn hàng.',
        });
      }
    } catch (err) {
      console.error('Error creating order:', err);
      setNotificationState({
        isOpen: true,
        type: 'error',
        title: 'LỖI KẾT NỐI HỆ THỐNG',
        message: 'Vui lòng kiểm tra kết nối mạng và thử lại sau ít phút.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Pricing Summary calculations
  const distanceKm = calculateDistance(senderLatitude, senderLongitude, receiverLatitude, receiverLongitude);
  const activeService = services.find((s) => s.serviceCode === serviceCode);

  let basePrice = 0;
  let distanceFee = 0;
  let weightFee = 0;
  let fragileSurcharge = 0;
  let insuranceFee = 0;
  let totalAmount = 0;
  let billableDistance = 0;
  let billableWeight = 0;

  if (activeService) {
    basePrice = Number(activeService.basePrice);
    const freeDistanceKm = activeService.freeDistanceKm;
    const pricePerKm = Number(activeService.pricePerKm);
    const freeWeightKg = activeService.freeWeightKg;
    const pricePerKg = Number(activeService.pricePerKg);

    const isDistanceBased = serviceCode === 'EXPRESS' || serviceCode === 'COLD_CHAIN';
    billableDistance = isDistanceBased ? Math.max(0, distanceKm - freeDistanceKm) : 0;
    distanceFee = isDistanceBased ? billableDistance * pricePerKm : 0;

    const volumetricWeight = (length * width * height) / 5000;
    const chargeableWeight = Math.max(weight, volumetricWeight);

    billableWeight = Math.max(0, chargeableWeight - freeWeightKg);
    weightFee = billableWeight * pricePerKg;

    fragileSurcharge = isFragile ? 15000 : 0;

    if (codAmount > 0) {
      insuranceFee = Math.min(50000, Math.max(0, codAmount * 0.005));
    }

    totalAmount = basePrice + distanceFee + weightFee + fragileSurcharge + insuranceFee;
  }

  const stepsList = [
    { step: 1, title: '1. Người Gửi & Điểm Lấy', icon: MapPin, color: 'text-red-600' },
    { step: 2, title: '2. Người Nhận & Điểm Giao', icon: MapPin, color: 'text-blue-600' },
    { step: 3, title: '3. Thông Tin Gói Hàng', icon: Package, color: 'text-amber-500' },
    { step: 4, title: '4. Dịch Vụ & Thanh Toán', icon: Truck, color: 'text-emerald-600' },
  ];

  const getFieldErrorClass = (fieldName: string) => {
    return showErrors && errors[fieldName]
      ? 'border-red-500 bg-red-50/50 ring-1 ring-red-500 placeholder-red-300'
      : 'border-[#e2e8f0] focus:border-[#bc0100]';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-2xl max-w-4xl w-full my-6 flex flex-col font-montserrat max-h-[92vh] overflow-hidden relative">
        {/* Header */}
        <div className="p-4 bg-[#161D25] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Package className="text-[#bc0100]" size={20} />
            <h3 className="text-sm font-extrabold uppercase tracking-wider">Đặt Đơn Hàng Mới</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer transition-colors p-1 rounded-lg hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* 4-Step Stepper Tabs Header (Unrestricted Clicking Enabled) */}
        <div className="bg-slate-100 border-b border-slate-200 p-2 flex items-center justify-between gap-1 overflow-x-auto shrink-0">
          {stepsList.map((item) => {
            const Icon = item.icon;
            const isActive = activeStep === item.step;
            const stepHasErrors = showErrors && Object.keys(errors).some(key => {
              if (item.step === 1) return ['customerId', 'senderName', 'senderPhone', 'senderAddressLine1', 'senderProvince', 'senderWard'].includes(key);
              if (item.step === 2) return ['receiverName', 'receiverPhone', 'receiverAddressLine1', 'receiverProvince', 'receiverWard'].includes(key);
              if (item.step === 3) return ['weight', 'length', 'width', 'height'].includes(key);
              return false;
            });

            return (
              <button
                key={item.step}
                type="button"
                onClick={() => handleSelectTab(item.step as any)}
                className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all text-xs font-bold cursor-pointer ${isActive
                  ? 'bg-white text-[#161D25] shadow-sm border border-slate-300 ring-2 ring-[#bc0100]/20'
                  : stepHasErrors
                    ? 'bg-red-100/70 text-red-700 border border-red-300 hover:bg-red-100'
                    : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
              >
                {stepHasErrors ? (
                  <AlertCircle size={16} className="text-red-600 shrink-0" />
                ) : (
                  <Icon size={16} className={`${isActive ? item.color : 'text-slate-500'} shrink-0`} />
                )}
                <span className="truncate">{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body - Prevents direct form submission on button clicks */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col text-xs text-gray-600">
          {/* Customer Selection for admin/staff */}
          {isAdminOrStaff && activeStep === 1 && (
            <div className={`p-3.5 mb-4 rounded-lg border flex flex-col gap-1.5 transition-all ${showErrors && errors.customerId ? 'bg-red-50/60 border-red-400 ring-1 ring-red-400' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-center gap-1.5 font-bold text-[#161D25] uppercase tracking-wider text-[10px]">
                <User size={14} className="text-[#bc0100]" />
                <span>Khách hàng thanh toán *</span>
              </div>
              <select
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  if (errors.customerId) setErrors(prev => ({ ...prev, customerId: false }));
                }}
                className={`w-full px-3 py-2 border rounded bg-white font-medium outline-none ${getFieldErrorClass('customerId')}`}
                required
              >
                <option value="">-- Chọn khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || c.companyName || c.user?.username || 'N/A'} ({c.customerCode}) - {c.email || 'N/A'}
                  </option>
                ))}
              </select>
              {showErrors && errorMessages.customerId && (
                <span className="text-[10px] text-red-600 font-medium">{errorMessages.customerId}</span>
              )}
            </div>
          )}

          {/* STEP 1: Sender & Pickup Address */}
          {activeStep === 1 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="border border-[#e2e8f0] p-4 rounded-xl flex flex-col gap-3 bg-white shadow-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#161D25] uppercase tracking-wider text-[11px]">
                    <MapPin className="text-[#bc0100]" size={16} />
                    <span>1. THÔNG TIN NGƯỜI GỬI & ĐIỂM LẤY HÀNG</span>
                  </div>
                  {showErrors && (errors.senderName || errors.senderPhone || errors.senderAddressLine1 || errors.senderProvince || errors.senderWard) && (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      <AlertCircle size={12} />
                      Vui lòng điền đúng thông tin viền đỏ!
                    </span>
                  )}
                </div>

                {/* Sổ địa chỉ đã lưu cho Người gửi (Shopee Style Quick Selector) */}
                {(loadingSavedAddresses || savedAddresses.length > 0) && (
                  <div className="flex flex-col gap-2 p-3 bg-red-50/40 border border-red-100 rounded-xl mb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#bc0100] flex items-center gap-1.5">
                        <BookMarked size={14} />
                        {loadingSavedAddresses ? 'Đang tải sổ địa chỉ...' : `Chọn nhanh địa chỉ lấy hàng đã lưu (${savedAddresses.length})`}
                      </span>
                      {selectedSenderAddressId && (
                        <span className="text-[9px] text-gray-400 italic">
                          (Đã chọn & có thể chỉnh sửa tùy ý bên dưới)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {savedAddresses.map((item: any) => {
                        const addr = item.address || item;
                        const isSelected = selectedSenderAddressId === (item.addressId || item.id);
                        const wardStr = addr.wardRelation?.fullName || addr.wardRelation?.name || addr.wardName || addr.ward || item.ward || '';
                        const provStr = addr.wardRelation?.province?.fullName || addr.wardRelation?.province?.name || addr.provinceName || addr.province || item.province || '';
                        const fullAddrStr = [addr.addressLine1, wardStr, provStr].filter(Boolean).join(', ');

                        return (
                          <div
                            key={item.id || item.addressId}
                            onClick={() => applySavedAddressToSender(item)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 flex items-center gap-3 relative ${
                              isSelected
                                ? 'border-[#bc0100] bg-white ring-2 ring-[#bc0100]/20 shadow-xs'
                                : 'border-[#e2e8f0] bg-white hover:border-[#bc0100]/50 hover:bg-gray-50'
                            }`}
                          >
                            {/* Radio/Check Indicator on Left (Centered Vertically) */}
                            <div className="shrink-0 flex items-center justify-center">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'border-[#bc0100] bg-[#bc0100] text-white shadow-xs'
                                  : 'border-gray-300 bg-white'
                              }`}>
                                {isSelected && <CheckCircle2 size={12} strokeWidth={3} className="text-white" />}
                              </div>
                            </div>

                            {/* Main Info (Middle) */}
                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  item.isDefault ? 'bg-[#bc0100] text-white' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.isDefault ? 'Mặc định' : item.addressType || 'Địa chỉ'}
                                </span>
                                <span className="font-bold text-gray-800 text-[11px] truncate">
                                  {item.contactName || 'Địa chỉ'}
                                </span>
                              </div>

                              <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight">
                                {fullAddrStr}
                              </p>

                              {item.contactPhone && (
                                <span className="text-[9px] text-gray-400">
                                  SĐT: {item.contactPhone}
                                </span>
                              )}
                            </div>

                            {/* Pencil Edit Button on Right */}
                            <button
                              type="button"
                              title="Chỉnh sửa địa chỉ này"
                              onClick={(e) => handleOpenEditAddressModal(item, 'sender', e)}
                              className="p-1.5 text-gray-400 hover:text-[#bc0100] hover:bg-red-50 rounded-full transition-colors cursor-pointer shrink-0 self-center"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => handleOpenAddAddressModal('sender')}
                        className="p-2.5 rounded-lg border border-dashed border-[#bc0100]/40 bg-white hover:bg-red-50/50 text-left flex items-center justify-center gap-1.5 text-xs font-bold text-[#bc0100] cursor-pointer shadow-xs transition-colors"
                      >
                        <Plus size={14} />
                        Thêm địa chỉ mới
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">
                      Họ tên người gửi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={!!selectedSenderAddressId}
                      placeholder="Nguyễn Văn A"
                      value={senderName}
                      onChange={(e) => {
                        setSenderName(e.target.value);
                        if (errors.senderName) setErrors(prev => ({ ...prev, senderName: false }));
                      }}
                      className={`w-full px-3 py-2 border rounded outline-none transition-colors ${selectedSenderAddressId ? 'bg-slate-100/80 cursor-not-allowed text-slate-700 font-medium border-slate-200' : getFieldErrorClass('senderName')}`}
                    />
                    {showErrors && errorMessages.senderName && (
                      <span className="text-[10px] text-red-600 font-medium">{errorMessages.senderName}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">
                      Số điện thoại (10 chữ số) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={!!selectedSenderAddressId}
                      placeholder="0901234567"
                      value={senderPhone}
                      onChange={(e) => {
                        setSenderPhone(e.target.value);
                        if (errors.senderPhone) setErrors(prev => ({ ...prev, senderPhone: false }));
                      }}
                      className={`w-full px-3 py-2 border rounded outline-none transition-colors ${selectedSenderAddressId ? 'bg-slate-100/80 cursor-not-allowed text-slate-700 font-medium border-slate-200' : getFieldErrorClass('senderPhone')}`}
                    />
                    {showErrors && errorMessages.senderPhone && (
                      <span className="text-[10px] text-red-600 font-medium">{errorMessages.senderPhone}</span>
                    )}
                  </div>
                </div>

                <AddressFormFields
                  token={token}
                  disabled={!!selectedSenderAddressId}
                  provinceCode={senderProvinceCode}
                  wardCode={senderWardCode}
                  addressLine1={senderAddressLine1}
                  hasErrorProvince={showErrors && errors.senderProvince}
                  hasErrorWard={showErrors && errors.senderWard}
                  hasErrorAddressLine1={showErrors && errors.senderAddressLine1}
                  onChange={({ province, provinceCode, ward, wardCode, addressLine1, latitude, longitude }) => {
                    setSenderProvince(province);
                    setSenderProvinceCode(provinceCode);
                    setSenderWard(ward);
                    setSenderWardCode(wardCode);
                    setSenderAddressLine1(addressLine1);

                    if (province) setErrors(prev => ({ ...prev, senderProvince: false }));
                    if (ward) setErrors(prev => ({ ...prev, senderWard: false }));
                    if (addressLine1) setErrors(prev => ({ ...prev, senderAddressLine1: false }));

                    if (latitude !== undefined && longitude !== undefined) {
                      setSenderLatitude(latitude);
                      setSenderLongitude(longitude);
                      setSenderTempLat(latitude);
                      setSenderTempLng(longitude);
                      setSenderMapCenter([longitude, latitude]);
                    }
                  }}
                  required
                />

                {/* Map for Sender Location */}
                <div className="flex flex-col gap-1 mt-2 border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center text-gray-500 font-bold uppercase tracking-wider text-[9px]">
                    <span>Bản đồ định vị điểm lấy hàng</span>
                  </div>

                  <div className="w-full h-64 rounded-lg border border-[#e2e8f0] overflow-hidden relative mt-1 bg-gray-50">
                    <Map
                      ref={senderMapCallbackRef}
                      center={senderMapCenter}
                      zoom={13}
                      className="w-full h-full"
                    >
                      {senderTempLat !== 0 && senderTempLng !== 0 && (
                        <MapMarker
                          longitude={senderTempLng}
                          latitude={senderTempLat}
                          draggable
                          onDragEnd={onSenderMarkerDragEnd}
                        >
                          <MarkerContent>
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-sm text-white transition-transform hover:scale-110"
                              style={{ backgroundColor: '#bc0100' }}
                            >
                              <MapPin className="h-3 w-3" />
                            </div>
                          </MarkerContent>
                        </MapMarker>
                      )}
                      <MapControls showZoom />
                    </Map>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-gray-400 uppercase text-[8px] tracking-wider">Vĩ độ (Latitude)</label>
                      <input
                        type="text"
                        readOnly
                        value={senderLatitude !== 0 ? senderLatitude : 'Chưa xác định'}
                        className="w-full px-2.5 py-1.5 border border-[#e2e8f0] rounded bg-gray-50 font-mono text-[10px] text-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-gray-400 uppercase text-[8px] tracking-wider">Kinh độ (Longitude)</label>
                      <input
                        type="text"
                        readOnly
                        value={senderLongitude !== 0 ? senderLongitude : 'Chưa xác định'}
                        className="w-full px-2.5 py-1.5 border border-[#e2e8f0] rounded bg-gray-50 font-mono text-[10px] text-gray-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Receiver & Delivery Address */}
          {activeStep === 2 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="border border-[#e2e8f0] p-4 rounded-xl flex flex-col gap-3 bg-white shadow-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#161D25] uppercase tracking-wider text-[11px]">
                    <MapPin className="text-blue-600" size={16} />
                    <span>2. THÔNG TIN NGƯỜI NHẬN & ĐIỂM GIAO HÀNG</span>
                  </div>
                  {showErrors && (errors.receiverName || errors.receiverPhone || errors.receiverAddressLine1 || errors.receiverProvince || errors.receiverWard) && (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      <AlertCircle size={12} />
                      Vui lòng điền đúng thông tin viền đỏ!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">
                      Họ tên người nhận <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Trần Thị B"
                      value={receiverName}
                      onChange={(e) => {
                        setReceiverName(e.target.value);
                        if (errors.receiverName) setErrors(prev => ({ ...prev, receiverName: false }));
                      }}
                      className={`w-full px-3 py-2 border rounded outline-none transition-colors ${getFieldErrorClass('receiverName')}`}
                    />
                    {showErrors && errorMessages.receiverName && (
                      <span className="text-[10px] text-red-600 font-medium">{errorMessages.receiverName}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">
                      Số điện thoại (10 chữ số) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="0987654321"
                      value={receiverPhone}
                      onChange={(e) => {
                        setReceiverPhone(e.target.value);
                        if (errors.receiverPhone) setErrors(prev => ({ ...prev, receiverPhone: false }));
                      }}
                      className={`w-full px-3 py-2 border rounded outline-none transition-colors ${getFieldErrorClass('receiverPhone')}`}
                    />
                    {showErrors && errorMessages.receiverPhone && (
                      <span className="text-[10px] text-red-600 font-medium">{errorMessages.receiverPhone}</span>
                    )}
                  </div>
                </div>

                <AddressFormFields
                  token={token}
                  provinceCode={receiverProvinceCode}
                  wardCode={receiverWardCode}
                  addressLine1={receiverAddressLine1}
                  hasErrorProvince={showErrors && errors.receiverProvince}
                  hasErrorWard={showErrors && errors.receiverWard}
                  hasErrorAddressLine1={showErrors && errors.receiverAddressLine1}
                  onChange={({ province, provinceCode, ward, wardCode, addressLine1, latitude, longitude }) => {
                    setReceiverProvince(province);
                    setReceiverProvinceCode(provinceCode);
                    setReceiverWard(ward);
                    setReceiverWardCode(wardCode);
                    setReceiverAddressLine1(addressLine1);

                    if (province) setErrors(prev => ({ ...prev, receiverProvince: false }));
                    if (ward) setErrors(prev => ({ ...prev, receiverWard: false }));
                    if (addressLine1) setErrors(prev => ({ ...prev, receiverAddressLine1: false }));

                    if (latitude !== undefined && longitude !== undefined) {
                      setReceiverLatitude(latitude);
                      setReceiverLongitude(longitude);
                      setReceiverTempLat(latitude);
                      setReceiverTempLng(longitude);
                      setReceiverMapCenter([longitude, latitude]);
                    }
                  }}
                  required
                />

                {/* Map for Receiver Location */}
                <div className="flex flex-col gap-1 mt-2 border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center text-gray-500 font-bold uppercase tracking-wider text-[9px]">
                    <span>Bản đồ định vị điểm giao hàng</span>
                  </div>

                  <div className="w-full h-64 rounded-lg border border-[#e2e8f0] overflow-hidden relative mt-1 bg-gray-50">
                    <Map
                      ref={receiverMapCallbackRef}
                      center={receiverMapCenter}
                      zoom={13}
                      className="w-full h-full"
                    >
                      {receiverTempLat !== 0 && receiverTempLng !== 0 && (
                        <MapMarker
                          longitude={receiverTempLng}
                          latitude={receiverTempLat}
                          draggable
                          onDragEnd={onReceiverMarkerDragEnd}
                        >
                          <MarkerContent>
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-sm text-white transition-transform hover:scale-110 bg-blue-600"
                            >
                              <MapPin className="h-3 w-3" />
                            </div>
                          </MarkerContent>
                        </MapMarker>
                      )}
                      <MapControls showZoom />
                    </Map>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-gray-400 uppercase text-[8px] tracking-wider">Vĩ độ (Latitude)</label>
                      <input
                        type="text"
                        readOnly
                        value={receiverLatitude !== 0 ? receiverLatitude : 'Chưa xác định'}
                        className="w-full px-2.5 py-1.5 border border-[#e2e8f0] rounded bg-gray-50 font-mono text-[10px] text-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-gray-400 uppercase text-[8px] tracking-wider">Kinh độ (Longitude)</label>
                      <input
                        type="text"
                        readOnly
                        value={receiverLongitude !== 0 ? receiverLongitude : 'Chưa xác định'}
                        className="w-full px-2.5 py-1.5 border border-[#e2e8f0] rounded bg-gray-50 font-mono text-[10px] text-gray-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Package Details */}
          {activeStep === 3 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="border border-[#e2e8f0] p-4 rounded-xl flex flex-col gap-3 bg-white shadow-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#161D25] uppercase tracking-wider text-[11px]">
                    <Package className="text-amber-500" size={16} />
                    <span>3. THÔNG TIN GÓI HÀNG</span>
                  </div>
                  {showErrors && (errors.weight || errors.length || errors.width || errors.height) && (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      <AlertCircle size={12} />
                      Vui lòng điền trọng lượng & kích thước viền đỏ!
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Mô tả chi tiết danh mục hàng hóa (Nhiều mặt hàng)</label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ:&#10;1. Áo sơ mi nữ&#10;2. Áo thun cotton nam..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100] resize-y text-xs font-normal"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Khai giá hàng hóa (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="Ví dụ: 500000"
                      value={declaredValue}
                      onChange={(e) => setDeclaredValue(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100] font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">
                      Trọng lượng (kg) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={weight}
                      onChange={(e) => {
                        setWeight(parseFloat(e.target.value));
                        if (errors.weight) setErrors(prev => ({ ...prev, weight: false }));
                      }}
                      className={`w-full px-3 py-2 border rounded outline-none font-mono transition-colors ${getFieldErrorClass('weight')}`}
                    />
                    {showErrors && errorMessages.weight && (
                      <span className="text-[10px] text-red-600 font-medium">{errorMessages.weight}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">
                      Dài (cm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={length}
                      onChange={(e) => {
                        setLength(parseInt(e.target.value));
                        if (errors.length) setErrors(prev => ({ ...prev, length: false }));
                      }}
                      className={`w-full px-3 py-2 border rounded outline-none font-mono transition-colors ${getFieldErrorClass('length')}`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">
                      Rộng (cm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={width}
                      onChange={(e) => {
                        setWidth(parseInt(e.target.value));
                        if (errors.width) setErrors(prev => ({ ...prev, width: false }));
                      }}
                      className={`w-full px-3 py-2 border rounded outline-none font-mono transition-colors ${getFieldErrorClass('width')}`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">
                      Cao (cm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={height}
                      onChange={(e) => {
                        setHeight(parseInt(e.target.value));
                        if (errors.height) setErrors(prev => ({ ...prev, height: false }));
                      }}
                      className={`w-full px-3 py-2 border rounded outline-none font-mono transition-colors ${getFieldErrorClass('height')}`}
                    />
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 leading-normal bg-slate-50 p-2.5 rounded border border-slate-200">
                  * Trọng lượng quy đổi thể tích: <span className="font-bold text-gray-700 font-mono">{((length * width * height) / 5000).toFixed(2)} kg</span> (áp dụng nếu lớn hơn trọng lượng thực tế). Công thức chuẩn: (Dài x Rộng x Cao) / 5000.
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Yêu cầu nhiệt độ (nếu có)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 2-8 °C"
                    value={temperatureRequirement}
                    onChange={(e) => setTemperatureRequirement(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isFragileOrderCheckbox"
                    checked={isFragile}
                    onChange={(e) => setIsFragile(e.target.checked)}
                    className="w-4 h-4 text-[#bc0100] border-gray-300 rounded focus:ring-[#bc0100] cursor-pointer"
                  />
                  <label htmlFor="isFragileOrderCheckbox" className="font-bold text-red-600 uppercase tracking-widest cursor-pointer select-none text-[10px]">
                    Hàng dễ vỡ / Cần nhẹ tay
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Service & Payment */}
          {activeStep === 4 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="border border-[#e2e8f0] p-4 rounded-xl flex flex-col gap-3 bg-white shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#161D25] uppercase tracking-wider text-[11px] border-b pb-2">
                  <Truck className="text-emerald-600" size={16} />
                  <span>4. DỊCH VỤ & THANH TOÁN</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Gói cước dịch vụ</label>
                  {loadingServices ? (
                    <div className="py-2 text-gray-400">Đang tải gói dịch vụ...</div>
                  ) : (
                    <>
                      <select
                        value={serviceCode}
                        onChange={(e) => setServiceCode(e.target.value)}
                        className="w-full px-3 py-2 border border-[#e2e8f0] rounded bg-white font-medium outline-none focus:border-[#bc0100]"
                        required
                      >
                        {services.map((s) => (
                          <option key={s.id} value={s.serviceCode}>
                            {s.serviceName} (Phí cơ bản: {formatCurrency(s.basePrice)})
                          </option>
                        ))}
                      </select>
                      {serviceCode === 'EXPRESS' && distanceKm > 20 && (
                        <div className="mt-1.5 p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-[10px] font-semibold leading-relaxed">
                          ⚠️ Dịch vụ Hỏa tốc 2h chỉ hỗ trợ giao hàng trong phạm vi bán kính tối đa 20 km. Vui lòng chọn gói dịch vụ khác.
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Hình thức gửi hàng</label>
                  <select
                    value={pickupType}
                    onChange={(e) => setPickupType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded bg-white font-medium outline-none focus:border-[#bc0100]"
                  >
                    <option value="PICKUP">Shipper đến lấy hàng tận nơi (PICKUP)</option>
                    <option value="DROP_OFF">Khách tự mang ra bưu cục gửi (DROP_OFF)</option>
                  </select>
                </div>

                {pickupType === 'PICKUP' && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex flex-col gap-2">
                    <label className="font-bold text-amber-900 uppercase text-[9px] tracking-wider flex items-center gap-1">
                      <span>⏰ Lịch hẹn shipper lấy hàng cố định</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-gray-500 uppercase">Ngày lấy hàng</span>
                        <select
                          value={pickupDateOption}
                          onChange={(e) => setPickupDateOption(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white font-medium text-xs outline-none focus:border-[#bc0100]"
                        >
                          <option value="TODAY">Hôm nay ({new Date().toLocaleDateString('vi-VN')})</option>
                          <option value="TOMORROW">Ngày mai ({new Date(Date.now() + 86400000).toLocaleDateString('vi-VN')})</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-gray-500 uppercase">Ca thu hàng</span>
                        <select
                          value={pickupShiftOption}
                          onChange={(e) => setPickupShiftOption(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-white font-medium text-xs outline-none focus:border-[#bc0100]"
                        >
                          <option value="MORNING">☀️ Ca Sáng (10:30 - 12:00)</option>
                          <option value="AFTERNOON">🌤️ Ca Chiều (16:00 - 18:00)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Người chịu phí</label>
                    <select
                      value={feePayer}
                      onChange={(e) => setFeePayer(e.target.value as any)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded bg-white font-medium outline-none focus:border-[#bc0100]"
                    >
                      <option value="SENDER">Người gửi trả (SENDER)</option>
                      <option value="RECEIVER">Người nhận trả (RECEIVER)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Hình thức thanh toán</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded bg-white font-medium outline-none focus:border-[#bc0100]"
                    >
                      <option value="CASH">Tiền mặt (CASH)</option>
                      <option value="BANK_TRANSFER">Chuyển khoản (BANK_TRANSFER)</option>
                      <option value="E_WALLET">Ví điện tử (E_WALLET)</option>
                      <option value="COD">Thu hộ lúc giao (COD)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Tiền thu hộ COD (nếu có)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={codAmount === 0 ? '' : codAmount}
                    onChange={(e) => setCodAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100] font-mono text-amber-600 font-bold"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                    * COD (Cash on Delivery) là số tiền shipper thu hộ người gửi khi giao hàng thành công (ví dụ: tiền bán sản phẩm). Nếu gửi quà tặng hoặc đã thanh toán trước, hãy để là 0.
                  </span>
                </div>

                {activeService && (
                  <div className="mt-2 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex flex-col gap-2.5">
                    <div className="font-extrabold text-[#161D25] uppercase tracking-wider text-[9px] border-b pb-1.5 flex justify-between items-center">
                      <span>Chi tiết cước tạm tính</span>
                      {distanceKm > 0 && <span className="text-gray-500 font-medium normal-case">(Khoảng cách: {distanceKm} km)</span>}
                    </div>
                    {serviceCode === 'EXPRESS' && distanceKm > 20 ? (
                      <div className="text-[11px] text-red-600 font-bold text-center py-4 bg-red-50 border border-red-100 rounded">
                        DỊCH VỤ HỎA TỐC KHÔNG KHẢ DỤNG<br />(Khoảng cách vượt quá giới hạn 20 km)
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 text-[11px]">
                        <div className="flex justify-between items-center text-gray-500">
                          <span>Cước cơ bản:</span>
                          <span className="font-medium text-gray-800">{formatCurrency(basePrice)}</span>
                        </div>
                        {distanceFee > 0 && (
                          <div className="flex justify-between items-center text-gray-500">
                            <span>Phí vượt cự ly (vượt {billableDistance} km):</span>
                            <span className="font-medium text-gray-800">+{formatCurrency(distanceFee)}</span>
                          </div>
                        )}
                        {weightFee > 0 && (
                          <div className="flex justify-between items-center text-gray-500">
                            <span>
                              Phí quá tải (vượt {billableWeight.toFixed(2)} kg
                              {((length * width * height) / 5000) > weight ? ' - quy đổi thể tích' : ''}):
                            </span>
                            <span className="font-medium text-gray-800">+{formatCurrency(weightFee)}</span>
                          </div>
                        )}
                        {fragileSurcharge > 0 && (
                          <div className="flex justify-between items-center text-gray-500">
                            <span>Phụ thu hàng dễ vỡ:</span>
                            <span className="font-medium text-[#bc0100]">+{formatCurrency(fragileSurcharge)}</span>
                          </div>
                        )}
                        {insuranceFee > 0 && (
                          <div className="flex justify-between items-center text-gray-500">
                            <span>Phí bảo hiểm COD (0.5%):</span>
                            <span className="font-medium text-gray-800">+{formatCurrency(insuranceFee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center font-bold text-sm border-t pt-2 mt-1">
                          <span className="text-[#161D25] uppercase tracking-wider text-[10px]">Tổng cước tạm tính:</span>
                          <span className="text-base text-[#bc0100] font-extrabold">{formatCurrency(totalAmount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stepper Footer Action Bar - All Buttons use type="button" to avoid accidental form submit */}
          <div className="flex justify-between items-center border-t border-gray-200 pt-4 mt-4 shrink-0">
            <div>
              {activeStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2.5 border border-gray-300 hover:bg-gray-100 rounded-lg font-bold uppercase tracking-wider text-[10px] text-gray-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Quay lại</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-gray-300 hover:bg-gray-100 rounded-lg font-bold uppercase tracking-wider text-[10px] text-gray-500 cursor-pointer transition-colors"
                >
                  Hủy
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {activeStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2.5 bg-[#161D25] hover:bg-gray-800 text-white rounded-lg font-bold uppercase tracking-wider text-[10px] cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <span>Tiếp tục</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenConfirmModal}
                  disabled={actionLoading || (serviceCode === 'EXPRESS' && distanceKm > 20)}
                  className="px-6 py-2.5 bg-[#bc0100] hover:bg-[#a00100] text-white rounded-lg font-bold uppercase tracking-wider text-[10px] disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-md transition-all"
                >
                  {actionLoading ? 'Đang xử lý...' : 'Xác nhận tạo đơn'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Popup before Order Creation */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-amber-100 rounded-full text-amber-700">
                <HelpCircle size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">XÁC NHẬN TẠO ĐƠN HÀNG</h4>
                <p className="text-[11px] text-slate-500">Vui lòng kiểm tra kỹ lại thông tin trước khi gửi lên hệ thống</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Người gửi:</span>
                <span className="font-bold text-slate-800">{senderName} ({senderPhone})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Người nhận:</span>
                <span className="font-bold text-slate-800">{receiverName} ({receiverPhone})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Gói cước & Phí ship:</span>
                <span className="font-bold text-slate-800">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Người trả cước:</span>
                <span className="font-bold text-slate-800">{feePayer === 'SENDER' ? 'Người gửi trả' : 'Người nhận trả'}</span>
              </div>
              {codAmount > 0 && (
                <div className="flex justify-between font-bold text-amber-700">
                  <span>Tiền COD thu hộ:</span>
                  <span>{formatCurrency(codAmount)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors cursor-pointer"
              >
                Xem lại đơn
              </button>
              <button
                type="button"
                onClick={executeOrderSubmission}
                disabled={actionLoading}
                className="px-5 py-2 bg-[#bc0100] hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow"
              >
                <ShieldCheck size={16} />
                <span>{actionLoading ? 'Đang tạo đơn...' : 'Đồng ý tạo đơn'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Custom Popup (Success & Error Modal) */}
      {notificationState.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-center">
              {notificationState.type === 'success' ? (
                <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 ring-8 ring-emerald-50">
                  <CheckCircle2 size={36} />
                </div>
              ) : (
                <div className="p-3 bg-red-100 rounded-full text-red-600 ring-8 ring-red-50">
                  <AlertCircle size={36} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <h4 className={`font-extrabold text-sm ${notificationState.type === 'success' ? 'text-emerald-800' : 'text-red-700'}`}>
                {notificationState.title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {notificationState.message}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setNotificationState(prev => ({ ...prev, isOpen: false }));
                  if (notificationState.type === 'success') {
                    onSuccess();
                    onClose();
                  }
                }}
                className={`w-full py-2.5 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer shadow ${notificationState.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                {notificationState.type === 'success' ? 'Hoàn tất' : 'Đóng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Create/Edit Modal */}
      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        isEditing={isEditingAddressModal}
        addressFormData={addressModalFormData}
        setAddressFormData={setAddressModalFormData}
        onSubmit={handleSaveAddressFromModal}
        actionLoading={addressModalActionLoading}
      />
    </div>
  );
};
