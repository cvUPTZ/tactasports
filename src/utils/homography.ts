/**
 * Homography Utility for Soccer Pitch Transformation
 * Maps Pixel Coordinates (x, y) <-> Field Coordinates (meters)
 */

export interface Point {
    x: number;
    y: number;
}

export type HomographyMatrix = number[][];

/**
 * Calculates the homography matrix from N source points to N destination points.
 * Uses Least Squares with coordinate normalization to solve the linear system for N >= 4.
 */
export function solveHomography(src: Point[], dst: Point[]): HomographyMatrix | null {
    if (src.length < 4 || dst.length < 4 || src.length !== dst.length) return null;

    // 1. Normalize coordinates for numerical stability
    const Tsrc = getNormalizationMatrix(src);
    const Tdst = getNormalizationMatrix(dst);

    const normSrc = src.map(p => transformPoint(p, Tsrc));
    const normDst = dst.map(p => transformPoint(p, Tdst));

    const n = normSrc.length;
    const A: number[][] = [];
    const b: number[] = [];

    for (let i = 0; i < n; i++) {
        const { x: sx, y: sy } = normSrc[i];
        const { x: dx, y: dy } = normDst[i];

        // Equation 1: sx*h0 + sy*h1 + h2 - sx*dx*h6 - sy*dx*h7 = dx
        A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
        b.push(dx);

        // Equation 2: sx*h3 + sy*h4 + h5 - sx*dy*h6 - sy*dy*h7 = dy
        A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
        b.push(dy);
    }

    // Solve the overdetermined system A * h = b using Normal Equations: (A^T * A) * h = A^T * b
    const At = transpose(A);
    const AtA = multiplyMatrices(At, A);
    const Atb = multiplyMatrixVector(At, b);

    const h = gaussElimination(AtA, Atb);

    if (!h) return null;

    const Hnorm: HomographyMatrix = [
        [h[0], h[1], h[2]],
        [h[3], h[4], h[5]],
        [h[6], h[7], 1]
    ];

    // 2. Denormalize: H = Tdst^-1 * Hnorm * Tsrc
    const TdstInv = invertHomography(Tdst);
    if (!TdstInv) return null;

    const temp = multiplyMatrices(TdstInv, Hnorm);
    return multiplyMatrices(temp, Tsrc);
}

/**
 * Normalization matrix: Centroid to origin and average distance to sqrt(2).
 */
function getNormalizationMatrix(points: Point[]): HomographyMatrix {
    const n = points.length;
    let centroidX = 0, centroidY = 0;
    for (const p of points) {
        centroidX += p.x;
        centroidY += p.y;
    }
    centroidX /= n;
    centroidY /= n;

    let avgDist = 0;
    for (const p of points) {
        const dx = p.x - centroidX;
        const dy = p.y - centroidY;
        avgDist += Math.sqrt(dx * dx + dy * dy);
    }
    avgDist /= n;

    const scale = avgDist > 1e-10 ? Math.sqrt(2) / avgDist : 1;

    return [
        [scale, 0, -scale * centroidX],
        [0, scale, -scale * centroidY],
        [0, 0, 1]
    ];
}

/** Helper for matrix transposition */
function transpose(A: number[][]): number[][] {
    const m = A.length;
    const n = A[0].length;
    const res = Array.from({ length: n }, () => new Array(m).fill(0));
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            res[j][i] = A[i][j];
        }
    }
    return res;
}

/** Helper for matrix multiplication */
function multiplyMatrices(A: number[][], B: number[][]): number[][] {
    const m = A.length;
    const n = A[0].length;
    const p = B[0].length;
    const res = Array.from({ length: m }, () => new Array(p).fill(0));
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < p; j++) {
            for (let k = 0; k < n; k++) {
                res[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return res;
}

/** Helper for matrix-vector multiplication */
function multiplyMatrixVector(A: number[][], v: number[]): number[] {
    const m = A.length;
    const n = A[0].length;
    const res = new Array(m).fill(0);
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            res[i] += A[i][j] * v[j];
        }
    }
    return res;
}


/**
 * Applies a 3x3 homography matrix to a point.
 */
export function transformPoint(p: Point, matrix: HomographyMatrix): Point {
    const [a, b, c] = matrix[0];
    const [d, e, f] = matrix[1];
    const [g, h, i] = matrix[2];

    const w = g * p.x + h * p.y + i;
    return {
        x: (a * p.x + b * p.y + c) / w,
        y: (d * p.x + e * p.y + f) / w
    };
}

/**
 * Standard Gaussian elimination for solving a system of linear equations.
 */
function gaussElimination(A: number[][], b: number[]): number[] | null {
    const n = b.length;
    for (let i = 0; i < n; i++) {
        // Find pivot
        let max = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > Math.abs(A[max][i])) max = k;
        }

        // Swap rows
        [A[i], A[max]] = [A[max], A[i]];
        [b[i], b[max]] = [b[max], b[i]];

        // Eliminate
        if (Math.abs(A[i][i]) < 1e-10) return null; // Singular matrix
        for (let k = i + 1; k < n; k++) {
            const factor = A[k][i] / A[i][i];
            b[k] -= factor * b[i];
            for (let j = i; j < n; j++) {
                A[k][j] -= factor * A[i][j];
            }
        }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += A[i][j] * x[j];
        }
        x[i] = (b[i] - sum) / A[i][i];
    }
    return x;
}

/**
 * Invert a 3x3 matrix (adjugate method).
 */
export function invertHomography(m: HomographyMatrix): HomographyMatrix | null {
    const [[a, b, c], [d, e, f], [g, h, i]] = m;
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    if (Math.abs(det) < 1e-10) return null;

    const invDet = 1 / det;
    return [
        [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
        [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
        [(d * h - e * g) * invDet, (g * b - a * h) * invDet, (a * e - b * d) * invDet]
    ];
}
