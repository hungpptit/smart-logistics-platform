import sys
import json
import time
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def solve_vrptw(data_input):
    start_solve_time = time.time()
    
    dist_matrix = data_input["distanceMatrix"]
    dur_matrix = data_input["durationMatrix"]
    deadlines_sec = data_input.get("deadlinesSec", [])
    return_to_hub = data_input.get("returnToHub", False)
    service_time_sec = data_input.get("serviceTimeSec", 300)
    time_limit_sec = data_input.get("timeLimitSeconds", 3)
    
    orig_num_nodes = len(dist_matrix)
    
    # Xử lý Open Route bằng cách thêm Dummy End Node nếu không yêu cầu quay về hub
    if return_to_hub:
        num_nodes = orig_num_nodes
        starts = [0]
        ends = [0]
        full_dist = dist_matrix
        full_dur = dur_matrix
    else:
        # Thêm node dummy ở cuối (index orig_num_nodes)
        num_nodes = orig_num_nodes + 1
        starts = [0]
        ends = [orig_num_nodes]
        
        full_dist = []
        full_dur = []
        for i in range(orig_num_nodes):
            row_dist = list(dist_matrix[i]) + [0] # từ i -> dummy cự ly bằng 0
            row_dur = list(dur_matrix[i]) + [0]   # từ i -> dummy thời gian bằng 0
            full_dist.append(row_dist)
            full_dur.append(row_dur)
            
        # Hàng cho dummy node
        dummy_dist_row = [1000000] * num_nodes
        dummy_dist_row[orig_num_nodes] = 0
        dummy_dur_row = [1000000] * num_nodes
        dummy_dur_row[orig_num_nodes] = 0
        full_dist.append(dummy_dist_row)
        full_dur.append(dummy_dur_row)

    manager = pywrapcp.RoutingIndexManager(num_nodes, 1, starts, ends)
    routing = pywrapcp.RoutingModel(manager)

    # 1. Cost Callback kết hợp Thời gian di chuyển + Phạt mét (DIST_W = 0.05) khớp 100% với hàm evaluator
    DIST_W = 0.05
    def arc_cost_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        transit_sec = full_dur[from_node][to_node]
        dist_m = full_dist[from_node][to_node]
        # Nhân 100 để bảo toàn độ chính xác số thực dưới dạng số nguyên (integer cost cho OR-Tools)
        return int(round((transit_sec + DIST_W * dist_m) * 100))

    arc_cost_callback_index = routing.RegisterTransitCallback(arc_cost_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(arc_cost_callback_index)

    # 2. Callback thời gian di chuyển + service time cho Time Dimension
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        transit_sec = full_dur[from_node][to_node]
        service = service_time_sec if (from_node > 0 and from_node < orig_num_nodes) else 0
        return transit_sec + service

    transit_time_callback_index = routing.RegisterTransitCallback(time_callback)

    # Thêm Dimension Thời Gian (Time Dimension) để kiểm soát Time Windows
    routing.AddDimension(
        transit_time_callback_index,
        36000,   # Cho phép chờ tối đa 10 tiếng
        86400,   # Giới hạn 24 tiếng
        True,    # Khởi đầu tại thời điểm t = 0
        "Time"
    )
    time_dimension = routing.GetDimensionOrDie("Time")

    # Đặt Soft Deadline cho từng khách hàng (Soft Upper Bound với penalty 2 điểm/giây trễ)
    for i in range(1, orig_num_nodes):
        node_index = manager.NodeToIndex(i)
        if i - 1 < len(deadlines_sec) and deadlines_sec[i - 1] is not None:
            dl = int(deadlines_sec[i - 1])
            # Phạt 2 điểm/giây nếu đến sau deadline
            time_dimension.SetCumulVarSoftUpperBound(node_index, dl, 2)

    # Cấu hình tìm kiếm
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = time_limit_sec

    solution = routing.SolveWithParameters(search_parameters)
    runtime_ms = int((time.time() - start_solve_time) * 1000)

    if solution:
        route = []
        index = routing.Start(0)
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            if node != 0 and node < orig_num_nodes:
                route.append(node) # 1-based matching original nodes
            index = solution.Value(routing.NextVar(index))
            
        # Kiểm tra tính toàn vẹn của hoán vị (phải đủ tất cả các node 1..N-1, không trùng lặp)
        expected_nodes = set(range(1, orig_num_nodes))
        if set(route) != expected_nodes or len(route) != (orig_num_nodes - 1):
            return {
                "success": False,
                "error": f"Invalid permutation: expected {orig_num_nodes - 1} stops, got {len(route)}",
                "runtimeMs": runtime_ms
            }

        return {
            "success": True,
            "route": route,
            "runtimeMs": runtime_ms
        }
    else:
        return {
            "success": False,
            "error": "No solution found by OR-Tools",
            "runtimeMs": runtime_ms
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)
        
    result = solve_vrptw(data)
    print(json.dumps(result))
