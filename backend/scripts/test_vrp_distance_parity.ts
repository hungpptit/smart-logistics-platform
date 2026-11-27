import assert from 'node:assert/strict';
import {
  DISTANCE_RULE_VERSION as BACKEND_RULE_VERSION,
  resolveClusterRouteFlags as backendResolveFlags,
  VRPService as BackendVRPService,
} from '../src/services/routing/vrp.service';
import {
  DISTANCE_RULE_VERSION as AI_RULE_VERSION,
  resolveClusterRouteFlags as aiResolveFlags,
  VRPService as AiVRPService,
} from '../../ai-service/src/services/vrp.service';

const hubLocation = { lat: 10.849, lng: 106.762 };

function makeOrder(id: string, status: string, lat = 10.858, lng = 106.775) {
  return {
    id,
    orderCode: `ORD-${id}`,
    status,
    pickupLatitude: lat,
    pickupLongitude: lng,
    deliveryLatitude: lat,
    deliveryLongitude: lng,
    estimatedDeliveryDate: null,
  } as any;
}

function buildAsymmetricMatrices(count: number) {
  const n = count + 1;
  const distanceMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const durationMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 1; i < n; i++) {
    distanceMatrix[0][i] = 3500; // Hub -> điểm dừng
    distanceMatrix[i][0] = 2100; // điểm dừng -> Hub (bất đối xứng)
    durationMatrix[0][i] = 900;  // 15 phút
    durationMatrix[i][0] = 540;  // 9 phút
    for (let j = 1; j < n; j++) {
      if (i !== j) {
        distanceMatrix[i][j] = 1000 * Math.abs(i - j);
        durationMatrix[i][j] = 240 * Math.abs(i - j);
      }
    }
  }
  return { distanceMatrix, durationMatrix, matrixSource: 'goong' };
}

async function runParityTests() {
  const backendVrp = new BackendVRPService();
  const aiVrp = new AiVRPService();

  assert.equal(BACKEND_RULE_VERSION, 'v2-way1');
  assert.equal(AI_RULE_VERSION, 'v2-way1');

  // 1. resolveClusterRouteFlags parity cho DELIVERY / PICKUP / ALL (thuần giao, thuần lấy, trộn)
  const flagCases = [
    {
      orders: [makeOrder('1', 'AT_HUB')],
      explicit: 'DELIVERY',
      expected: { includeStartFromHub: true, returnToHub: false, distanceRule: 'DELIVERY' },
    },
    {
      orders: [makeOrder('2', 'READY_FOR_PICKUP')],
      explicit: 'PICKUP',
      expected: { includeStartFromHub: false, returnToHub: true, distanceRule: 'PICKUP' },
    },
    {
      orders: [makeOrder('3', 'AT_HUB'), makeOrder('4', 'OUT_FOR_DELIVERY')],
      explicit: 'ALL',
      expected: { includeStartFromHub: true, returnToHub: false, distanceRule: 'DELIVERY' },
    },
    {
      orders: [makeOrder('5', 'READY_FOR_PICKUP'), makeOrder('6', 'PICKING_UP')],
      explicit: 'ALL',
      expected: { includeStartFromHub: false, returnToHub: true, distanceRule: 'PICKUP' },
    },
    {
      orders: [makeOrder('7', 'AT_HUB'), makeOrder('8', 'READY_FOR_PICKUP')],
      explicit: 'ALL',
      expected: { includeStartFromHub: true, returnToHub: true, distanceRule: 'ROUND_TRIP' },
    },
  ];

  for (const tc of flagCases) {
    const backendFlags = backendResolveFlags(tc.orders, tc.explicit);
    const aiFlags = aiResolveFlags(tc.orders, tc.explicit);
    assert.deepEqual(backendFlags, aiFlags, `Flag mismatch for explicit=${tc.explicit}`);
    assert.equal(backendFlags.includeStartFromHub, tc.expected.includeStartFromHub);
    assert.equal(backendFlags.returnToHub, tc.expected.returnToHub);
    assert.equal(backendFlags.distanceRule, tc.expected.distanceRule);
  }

  // 2. Parity 1 đơn và 3 đơn cùng tọa độ trên ma trận bất đối xứng
  const singleOrder = [makeOrder('s1', 'READY_FOR_PICKUP')];
  const threeSamePointOrders = [
    makeOrder('m1', 'READY_FOR_PICKUP'),
    makeOrder('m2', 'READY_FOR_PICKUP'),
    makeOrder('m3', 'READY_FOR_PICKUP'),
  ];
  const mat1 = buildAsymmetricMatrices(1);
  const samePointZeroDistMat3 = {
    distanceMatrix: [
      [0, 3500, 3500, 3500],
      [2100, 0, 0, 0],
      [2100, 0, 0, 0],
      [2100, 0, 0, 0],
    ],
    durationMatrix: [
      [0, 900, 900, 900],
      [540, 0, 0, 0],
      [540, 0, 0, 0],
      [540, 0, 0, 0],
    ],
    matrixSource: 'goong',
  };
  const now = new Date('2026-11-27T09:00:00.000Z');

  // PICKUP (includeStartFromHub=false, returnToHub=true): lấy chiều quay về [last][0] = 2.1 km
  const bPickup1 = await backendVrp.optimizeRouteWithMetrics(singleOrder, hubLocation, now, true, mat1, false);
  const aPickup1 = await aiVrp.optimizeRouteWithMetrics(singleOrder, hubLocation, now, true, mat1, false);
  assert.deepEqual(bPickup1.metrics, aPickup1.metrics);
  assert.equal(bPickup1.metrics.plannedDistanceKm, 2.1);
  assert.equal(bPickup1.metrics.plannedDurationMin, 14);

  const bPickup3 = await backendVrp.optimizeRouteWithMetrics(
    threeSamePointOrders,
    hubLocation,
    now,
    true,
    samePointZeroDistMat3,
    false
  );
  const aPickup3 = await aiVrp.optimizeRouteWithMetrics(
    threeSamePointOrders,
    hubLocation,
    now,
    true,
    samePointZeroDistMat3,
    false
  );
  assert.deepEqual(bPickup3.metrics, aPickup3.metrics);
  assert.equal(bPickup3.metrics.plannedDistanceKm, 2.1);
  assert.equal(bPickup3.metrics.plannedDurationMin, 24);

  // DELIVERY (includeStartFromHub=true, returnToHub=false): lấy chiều đi [0][first] = 3.5 km
  const bDeliv1 = await backendVrp.optimizeRouteWithMetrics(singleOrder, hubLocation, now, false, mat1, true);
  const aDeliv1 = await aiVrp.optimizeRouteWithMetrics(singleOrder, hubLocation, now, false, mat1, true);
  assert.deepEqual(bDeliv1.metrics, aDeliv1.metrics);
  assert.equal(bDeliv1.metrics.plannedDistanceKm, 3.5);
  assert.equal(bDeliv1.metrics.plannedDurationMin, 20);

  const bDeliv3 = await backendVrp.optimizeRouteWithMetrics(
    threeSamePointOrders,
    hubLocation,
    now,
    false,
    samePointZeroDistMat3,
    true
  );
  const aDeliv3 = await aiVrp.optimizeRouteWithMetrics(
    threeSamePointOrders,
    hubLocation,
    now,
    false,
    samePointZeroDistMat3,
    true
  );
  assert.deepEqual(bDeliv3.metrics, aDeliv3.metrics);
  assert.equal(bDeliv3.metrics.plannedDistanceKm, 3.5);
  assert.equal(bDeliv3.metrics.plannedDurationMin, 30);

  // ROUND_TRIP / Benchmark (includeStartFromHub=true, returnToHub=true): 3.5 + 2.1 = 5.6 km
  const bRound1 = await backendVrp.optimizeRouteWithMetrics(singleOrder, hubLocation, now, true, mat1, true);
  const aRound1 = await aiVrp.optimizeRouteWithMetrics(singleOrder, hubLocation, now, true, mat1, true);
  assert.deepEqual(bRound1.metrics, aRound1.metrics);
  assert.equal(bRound1.metrics.plannedDistanceKm, 5.6);
  assert.equal(bRound1.metrics.plannedDurationMin, 29);

  const bRound3 = await backendVrp.optimizeRouteWithMetrics(
    threeSamePointOrders,
    hubLocation,
    now,
    true,
    samePointZeroDistMat3,
    true
  );
  const aRound3 = await aiVrp.optimizeRouteWithMetrics(
    threeSamePointOrders,
    hubLocation,
    now,
    true,
    samePointZeroDistMat3,
    true
  );
  assert.deepEqual(bRound3.metrics, aRound3.metrics);
  assert.equal(bRound3.metrics.plannedDistanceKm, 5.6);
  assert.equal(bRound3.metrics.plannedDurationMin, 39);

  // 3. Multi-point bất đối xứng khác tọa độ: so khớp giữa backend và ai-service
  const distinct3 = [
    makeOrder('d1', 'READY_FOR_PICKUP', 10.851, 106.768),
    makeOrder('d2', 'READY_FOR_PICKUP', 10.855, 106.774),
    makeOrder('d3', 'READY_FOR_PICKUP', 10.861, 106.781),
  ];
  const mat3 = buildAsymmetricMatrices(3);
  for (const [returnToHub, includeStartFromHub] of [
    [false, true],
    [true, false],
    [true, true],
  ] as const) {
    const bMulti = await backendVrp.optimizeRouteWithMetrics(distinct3, hubLocation, now, returnToHub, mat3, includeStartFromHub);
    const aMulti = await aiVrp.optimizeRouteWithMetrics(distinct3, hubLocation, now, returnToHub, mat3, includeStartFromHub);
    assert.deepEqual(bMulti.metrics, aMulti.metrics);
  }

  console.log('✅ VRP parity test passed (backend <-> ai-service, 1..N stops, asymmetric Goong, DELIVERY/PICKUP/ALL)');
}

runParityTests().catch((err) => {
  console.error('❌ VRP parity test failed:', err);
  process.exit(1);
});
