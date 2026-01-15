// Mathematical utility functions
export class MathUtils {
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static angleBetween(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    static normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    static randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static randomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }

    static pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }

    static circlesCollide(x1, y1, r1, x2, y2, r2) {
        const dist = this.distance(x1, y1, x2, y2);
        return dist < r1 + r2;
    }

    static circleRectCollide(cx, cy, radius, rx, ry, rw, rh) {
        // Find closest point on rectangle to circle center
        const closestX = this.clamp(cx, rx, rx + rw);
        const closestY = this.clamp(cy, ry, ry + rh);

        // Check if distance is less than radius
        const dist = this.distance(cx, cy, closestX, closestY);
        return dist < radius;
    }

    static lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
        // Check if line intersects with any of the rectangle's edges
        return (
            this.lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
            this.lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
            this.lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry + rh, rx, ry + rh) ||
            this.lineIntersectsLine(x1, y1, x2, y2, rx, ry + rh, rx, ry)
        );
    }

    static lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = ((x1 - x2) * (y3 - y4)) - ((y1 - y2) * (x3 - x4));
        if (denom === 0) return false;

        const t = (((x1 - x3) * (y3 - y4)) - ((y1 - y3) * (x3 - x4))) / denom;
        const u = -(((x1 - x2) * (y1 - y3)) - ((y1 - y2) * (x1 - x3))) / denom;

        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
}
