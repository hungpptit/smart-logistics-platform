import sys
import json
import time
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def solve_multi_vehicle_vrp(data_input):
    start_solve_time = time.time()
    
    dist_matrix = data_input["distanceMatrix"]
    dur_matrix = data_input["durationMatrix"]
    num_vehicles = data_input.get("numVehicles", 4)
    max_stops = data_input.get("maxStopsPerVehicle", 25)
    min_stops = data_input.get("minStopsPerVehicle", 8)
    force_all_vehicles = data_input.get("forceAllVehicles", False)
    return_to_hub = data_input.get("returnToHub", False)
    service_time_sec = data_input.get("serviceTimeSec", 300)
    max_duration_sec = int(data_input.get("maxDurationMin", 180) * 60) # Mặc định trần ca 3h (180 phút)
    time_limit_sec = data_input.get("timeLimitSeconds", 10)
    weights = data_input.get("weights", []) # mảng kg của 51 đơn
    volumes = data_input.get("volumes", []) # mảng m3 của 51 đơn
    max_weight = data_input.get("maxWeightKg", 50.0)
    max_volume = data_input.get("maxVolumeM3", 0.20)
    
    orig_num_nodes = len(dist_matrix) # 52 (0: hub, 1..51: orders)
    
    # Xử lý Open Route (return_to_hub = False)
    if return_to_hub:
        num_nodes = orig_num_nodes
        starts = [0] * num_vehicles
        ends = [0] * num_vehicles
        full_dist = dist_matrix
        full_dur = dur_matrix
    else:
        # Dummy end node (index = orig_num_nodes)
        num_nodes = orig_num_nodes + 1
        starts = [0] * num_vehicles
        ends = [orig_num_nodes] * num_vehicles
        
        full_dist = []
        full_dur = []
        for i in range(orig_num_nodes):
            row_dist = list(dist_matrix[i]) + [0] # từ i -> dummy cự ly = 0
            row_dur = list(dur_matrix[i]) + [0]
            full_dist.append(row_dist)
            full_dur.append(row_dur)
            
        dummy_dist_row = [1000000] * num_nodes
        dummy_dist_row[orig_num_nodes] = 0
        dummy_dur_row = [1000000] * num_nodes
        dummy_dur_row[orig_num_nodes] = 0
        full_dist.append(dummy_dist_row)
        full_dur.append(dummy_dur_row)

    manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, starts, ends)
    routing = pywrapcp.RoutingModel(manager)

    objective = data_input.get("objective", "time")

    # 1. Cost Callback: Tối thiểu hóa thời gian di chuyển (quy đổi sang tương đương mét theo vận tốc 11km/h) + cự ly
    if objective == "distance":
        def cost_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return int(full_dist[from_node][to_node])
    else:
        # 1 giây di chuyển tương đương ~3.06 mét (ở vận tốc 11 km/h)
        def cost_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return int(full_dist[from_node][to_node] + full_dur[from_node][to_node] * 3)

    cost_callback_index = routing.RegisterTransitCallback(cost_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(cost_callback_index)

    # 2. Demand Dimension: Giới hạn số đơn tối đa cho mỗi xe
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        if 1 <= from_node < orig_num_nodes:
            return 1 # 1 đơn
        return 0

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0, # null capacity slack
        [max_stops] * num_vehicles, # capacity per vehicle
        True, # start cumul to zero
        "Capacity"
    )
    capacity_dim = routing.GetDimensionOrDie("Capacity")

    # 3. Weight Dimension (nếu có dữ liệu)
    if weights and len(weights) >= orig_num_nodes - 1:
        def weight_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            if 1 <= from_node < orig_num_nodes:
                return int(weights[from_node - 1] * 100) # gram/10
            return 0
        weight_callback_index = routing.RegisterUnaryTransitCallback(weight_callback)
        routing.AddDimensionWithVehicleCapacity(
            weight_callback_index,
            0,
            [int(max_weight * 100)] * num_vehicles,
            True,
            "Weight"
        )

    # 4. Volume Dimension (nếu có dữ liệu)
    if volumes and len(volumes) >= orig_num_nodes - 1:
        def volume_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            if 1 <= from_node < orig_num_nodes:
                return int(volumes[from_node - 1] * 10000) # cm3 / 100
            return 0
        volume_callback_index = routing.RegisterUnaryTransitCallback(volume_callback)
        routing.AddDimensionWithVehicleCapacity(
            volume_callback_index,
            0,
            [int(max_volume * 10000)] * num_vehicles,
            True,
            "Volume"
        )

    # 5. Time Dimension (Thời gian di chuyển + 5 phút dừng mỗi đơn)
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        travel_sec = int(full_dur[from_node][to_node])
        service_sec = service_time_sec if (1 <= from_node < orig_num_nodes) else 0
        return travel_sec + service_sec

    time_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.AddDimension(
        time_callback_index,
        0, # no slack
        max_duration_sec * 2, # Upper bound cho dimension
        True, # start cumul to zero
        "Time"
    )
    time_dimension = routing.GetDimensionOrDie("Time")
    
    # Ràng buộc trần thời gian tối đa cho mỗi ca (Makespan per route <= max_duration_sec)
    for v in range(num_vehicles):
        time_dimension.CumulVar(routing.End(v)).SetMax(max_duration_sec)

    # 6. Biến thể A: Bắt buộc dùng đủ xe & có phân bổ tối thiểu công bằng (ít nhất min_stops mỗi xe)
    if force_all_vehicles:
        for v in range(num_vehicles):
            capacity_dim.CumulVar(routing.End(v)).SetMin(min_stops)

    # Cấu hình tìm kiếm
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        if force_all_vehicles
        else routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = time_limit_sec

    solution = routing.SolveWithParameters(search_parameters)
    solver_runtime_ms = int((time.time() - start_solve_time) * 1000)

    if not solution:
        return {
            "success": False,
            "message": "OR-Tools cannot find a valid solution with given constraints",
            "solverRuntimeMs": solver_runtime_ms
        }

    routes = []
    total_dist_meters = 0
    total_dur_seconds = 0
    makespan_min = 0

    for v in range(num_vehicles):
        route_nodes = []
        index = routing.Start(v)
        v_dist = 0
        v_dur = 0
        
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            if 1 <= node < orig_num_nodes:
                route_nodes.append(node)
            next_index = solution.Value(routing.NextVar(index))
            next_node = manager.IndexToNode(next_index)
            
            # Chỉ cộng quãng đường/thời gian thực giữa các node thực tế
            if node < orig_num_nodes and next_node < orig_num_nodes:
                v_dist += dist_matrix[node][next_node]
                v_dur += dur_matrix[node][next_node]
            elif node < orig_num_nodes and next_node == orig_num_nodes:
                # Dummy end node trong open route -> cự ly 0
                pass
                
            index = next_index

        total_dist_meters += v_dist
        total_dur_seconds += v_dur

        route_travel_min = round(v_dur / 60, 1)
        route_service_min = round(len(route_nodes) * (service_time_sec / 60), 1)
        route_total_min = round(route_travel_min + route_service_min, 1)
        if route_total_min > makespan_min:
            makespan_min = route_total_min

        v_weight = sum([weights[n - 1] for n in route_nodes]) if weights else 0
        v_vol = sum([volumes[n - 1] for n in route_nodes]) if volumes else 0

        routes.append({
            "vehicleIndex": v,
            "stops": route_nodes,
            "stopsCount": len(route_nodes),
            "distanceMeters": v_dist,
            "distanceKm": round(v_dist / 1000, 2),
            "travelDurationMin": route_travel_min,
            "serviceDurationMin": route_service_min,
            "totalDurationMin": route_total_min,
            "totalWeightKg": round(v_weight, 2),
            "totalVolumeM3": round(v_vol, 4)
        })

    return {
        "success": True,
        "solverRuntimeMs": solver_runtime_ms,
        "totalDistanceMeters": total_dist_meters,
        "totalDistanceKm": round(total_dist_meters / 1000, 2),
        "totalTravelDurationMin": round(total_dur_seconds / 60, 1),
        "totalServiceDurationMin": round((orig_num_nodes - 1) * (service_time_sec / 60), 1),
        "totalDurationMin": round(total_dur_seconds / 60 + (orig_num_nodes - 1) * (service_time_sec / 60), 1),
        "makespanMin": makespan_min,
        "routes": routes,
        "activeVehicles": len([r for r in routes if r["stopsCount"] > 0])
    }

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.stdin.read())
        result = solve_multi_vehicle_vrp(input_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
