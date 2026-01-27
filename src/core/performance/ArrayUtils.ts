/**
 * 高效数组操作工具
 * 提供零分配或最小分配的数组操作
 */

/**
 * 预分配的临时数组缓存
 */
const tempArrays = {
  float32: new Float32Array(10000),
  float64: new Float64Array(1000),
  int32: new Int32Array(10000),
  uint32: new Uint32Array(10000),
  uint16: new Uint16Array(10000),
  uint8: new Uint8Array(10000),
  indices: new Uint32Array(10000),
};

/**
 * 获取临时 Float32Array
 * 注意：返回的数组是共享的，不要长期持有
 */
export function getTempFloat32(size: number): Float32Array {
  if (size > tempArrays.float32.length) {
    tempArrays.float32 = new Float32Array(size * 2);
  }
  return tempArrays.float32.subarray(0, size);
}

/**
 * 获取临时 Uint32Array
 */
export function getTempUint32(size: number): Uint32Array {
  if (size > tempArrays.uint32.length) {
    tempArrays.uint32 = new Uint32Array(size * 2);
  }
  return tempArrays.uint32.subarray(0, size);
}

/**
 * 获取临时索引数组
 */
export function getTempIndices(size: number): Uint32Array {
  if (size > tempArrays.indices.length) {
    tempArrays.indices = new Uint32Array(size * 2);
  }
  return tempArrays.indices.subarray(0, size);
}

/**
 * 原地排序 Float32Array（基于索引）
 * 返回排序后的索引
 */
export function sortFloat32Indices(
  values: Float32Array,
  indices: Uint32Array,
  count: number,
  ascending: boolean = true
): void {
  // 使用快速排序
  quickSortIndices(values, indices, 0, count - 1, ascending);
}

function quickSortIndices(
  values: Float32Array,
  indices: Uint32Array,
  left: number,
  right: number,
  ascending: boolean
): void {
  if (left >= right) return;
  
  const pivotIdx = partition(values, indices, left, right, ascending);
  quickSortIndices(values, indices, left, pivotIdx - 1, ascending);
  quickSortIndices(values, indices, pivotIdx + 1, right, ascending);
}

function partition(
  values: Float32Array,
  indices: Uint32Array,
  left: number,
  right: number,
  ascending: boolean
): number {
  const pivotValue = values[indices[right]];
  let i = left - 1;
  
  for (let j = left; j < right; j++) {
    const compare = ascending
      ? values[indices[j]] <= pivotValue
      : values[indices[j]] >= pivotValue;
    
    if (compare) {
      i++;
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }
  }
  
  const temp = indices[i + 1];
  indices[i + 1] = indices[right];
  indices[right] = temp;
  
  return i + 1;
}

/**
 * 批量求和
 */
export function sumFloat32(arr: Float32Array, start: number = 0, end?: number): number {
  const len = end ?? arr.length;
  let sum = 0;
  
  // 使用Kahan求和减少浮点误差
  let c = 0;
  for (let i = start; i < len; i++) {
    const y = arr[i] - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
  }
  
  return sum;
}

/**
 * 批量求平均
 */
export function avgFloat32(arr: Float32Array, start: number = 0, end?: number): number {
  const len = end ?? arr.length;
  const count = len - start;
  if (count === 0) return 0;
  return sumFloat32(arr, start, end) / count;
}

/**
 * 批量求最大值
 */
export function maxFloat32(arr: Float32Array, start: number = 0, end?: number): number {
  const len = end ?? arr.length;
  if (len === start) return 0;
  
  let max = arr[start];
  for (let i = start + 1; i < len; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
}

/**
 * 批量求最小值
 */
export function minFloat32(arr: Float32Array, start: number = 0, end?: number): number {
  const len = end ?? arr.length;
  if (len === start) return 0;
  
  let min = arr[start];
  for (let i = start + 1; i < len; i++) {
    if (arr[i] < min) min = arr[i];
  }
  return min;
}

/**
 * 批量乘法（原地）
 */
export function mulScalarInPlace(arr: Float32Array, scalar: number): void {
  for (let i = 0; i < arr.length; i++) {
    arr[i] *= scalar;
  }
}

/**
 * 批量加法（原地）
 */
export function addScalarInPlace(arr: Float32Array, scalar: number): void {
  for (let i = 0; i < arr.length; i++) {
    arr[i] += scalar;
  }
}

/**
 * 批量限制范围（原地）
 */
export function clampInPlace(arr: Float32Array, min: number, max: number): void {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < min) arr[i] = min;
    else if (arr[i] > max) arr[i] = max;
  }
}

/**
 * 向量点积
 */
export function dotProduct(a: Float32Array, b: Float32Array, length?: number): number {
  const len = length ?? Math.min(a.length, b.length);
  let sum = 0;
  
  // 循环展开
  const blockSize = 4;
  const blocks = Math.floor(len / blockSize);
  
  let i = 0;
  for (; i < blocks * blockSize; i += blockSize) {
    sum += a[i] * b[i] +
           a[i + 1] * b[i + 1] +
           a[i + 2] * b[i + 2] +
           a[i + 3] * b[i + 3];
  }
  
  // 处理剩余
  for (; i < len; i++) {
    sum += a[i] * b[i];
  }
  
  return sum;
}

/**
 * 二分查找（升序数组）
 * 返回第一个 >= target 的位置
 */
export function lowerBound(arr: Float32Array, target: number, start: number = 0, end?: number): number {
  let lo = start;
  let hi = end ?? arr.length;
  
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  
  return lo;
}

/**
 * 二分查找（升序数组）
 * 返回第一个 > target 的位置
 */
export function upperBound(arr: Float32Array, target: number, start: number = 0, end?: number): number {
  let lo = start;
  let hi = end ?? arr.length;
  
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] <= target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  
  return lo;
}

/**
 * 移动窗口求和
 * 返回每个位置的窗口和
 */
export function movingSum(
  arr: Float32Array,
  windowSize: number,
  output: Float32Array
): void {
  if (arr.length === 0 || windowSize <= 0) return;
  
  let sum = 0;
  
  // 初始窗口
  for (let i = 0; i < Math.min(windowSize, arr.length); i++) {
    sum += arr[i];
    output[i] = sum;
  }
  
  // 滑动窗口
  for (let i = windowSize; i < arr.length; i++) {
    sum += arr[i] - arr[i - windowSize];
    output[i] = sum;
  }
}

/**
 * 指数移动平均
 */
export function exponentialMovingAverage(
  arr: Float32Array,
  alpha: number,
  output: Float32Array
): void {
  if (arr.length === 0) return;
  
  output[0] = arr[0];
  const oneMinusAlpha = 1 - alpha;
  
  for (let i = 1; i < arr.length; i++) {
    output[i] = alpha * arr[i] + oneMinusAlpha * output[i - 1];
  }
}

/**
 * 填充序列（0, 1, 2, ...）
 */
export function fillSequence(arr: Uint32Array, start: number = 0): void {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = start + i;
  }
}

/**
 * 批量复制
 */
export function copyTo<T extends Float32Array | Float64Array | Uint32Array | Uint16Array | Uint8Array>(
  src: T,
  dst: T,
  srcStart: number = 0,
  dstStart: number = 0,
  count?: number
): void {
  const len = count ?? src.length - srcStart;
  for (let i = 0; i < len; i++) {
    dst[dstStart + i] = src[srcStart + i];
  }
}

/**
 * 批量设置条件值
 * 如果条件数组对应位置为true，则设置值
 */
export function setIfTrue(
  arr: Float32Array,
  conditions: Uint8Array,
  value: number
): void {
  for (let i = 0; i < arr.length; i++) {
    if (conditions[i]) {
      arr[i] = value;
    }
  }
}

/**
 * 计算直方图
 */
export function histogram(
  values: Float32Array,
  buckets: number,
  min: number,
  max: number
): Uint32Array {
  const result = new Uint32Array(buckets);
  const range = max - min;
  if (range <= 0) return result;
  
  const scale = buckets / range;
  
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (val >= min && val < max) {
      const bucket = Math.floor((val - min) * scale);
      result[bucket]++;
    } else if (val >= max) {
      result[buckets - 1]++;
    }
  }
  
  return result;
}

/**
 * 稀疏数组压缩
 * 只保留非零值
 */
export function compress(
  values: Float32Array,
  threshold: number = 0
): { indices: Uint32Array; values: Float32Array } {
  // 第一遍：计数
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (Math.abs(values[i]) > threshold) {
      count++;
    }
  }
  
  // 分配结果数组
  const indices = new Uint32Array(count);
  const compressed = new Float32Array(count);
  
  // 第二遍：填充
  let j = 0;
  for (let i = 0; i < values.length; i++) {
    if (Math.abs(values[i]) > threshold) {
      indices[j] = i;
      compressed[j] = values[i];
      j++;
    }
  }
  
  return { indices, values: compressed };
}

/**
 * 稀疏数组解压
 */
export function decompress(
  indices: Uint32Array,
  values: Float32Array,
  size: number,
  defaultValue: number = 0
): Float32Array {
  const result = new Float32Array(size).fill(defaultValue);
  
  for (let i = 0; i < indices.length; i++) {
    result[indices[i]] = values[i];
  }
  
  return result;
}

/**
 * 计算差分（一阶差分）
 */
export function diff(arr: Float32Array, output?: Float32Array): Float32Array {
  if (arr.length <= 1) return new Float32Array(0);
  
  const result = output ?? new Float32Array(arr.length - 1);
  
  for (let i = 0; i < arr.length - 1; i++) {
    result[i] = arr[i + 1] - arr[i];
  }
  
  return result;
}

/**
 * 累积和
 */
export function cumsum(arr: Float32Array, output?: Float32Array): Float32Array {
  const result = output ?? new Float32Array(arr.length);
  
  if (arr.length === 0) return result;
  
  result[0] = arr[0];
  for (let i = 1; i < arr.length; i++) {
    result[i] = result[i - 1] + arr[i];
  }
  
  return result;
}