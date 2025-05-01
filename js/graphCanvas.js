
class Element {
    constructor() {
        this.constructor.allElements.push(this);
        this.draggable = true;
        this.deletable = true;
        this.specialTag = null;
    }

    isHit(mouseX, mouseY) {
        // default: not interactable unless subclass defines it
        return false;
    }

    drag(dx, dy) {
        // default: move x and y if they exist
        if (this.hasOwnProperty("x") && this.hasOwnProperty("y")) {
            this.x += dx;
            this.y += dy;
        }
    }

    static allElements = [];
    static deletedElements = [];

    delete() {
        const index = Element.allElements.indexOf(this);
        if (index !== -1) {
            Element.allElements.splice(index, 1);
        }

        Element.deletedElements.push(this);
    }
}

class Point extends Element {
    constructor(name, x, y, color, intersections) {
        super();
        this.name = name;
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 5;
        this.intersections = intersections;
        this.draggable = false;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();
    }

    isHit(mouseX, mouseY) {
        let dx = mouseX - this.x;
        let dy = mouseY - this.y;
        return (dx * dx + dy * dy <= this.radius * this.radius);
    }
}

class Label extends Element {
    constructor(name, x, y, color, textSize, ctx) {
        super();
        this.name = name;
        this.x = x;
        this.y = y;
        this.color = color;
        this.textSize = textSize;
        this.line = null;
        this.label = null;
        this.storeWidth(ctx);
    }

    storeWidth(ctx) {
        ctx.font = `${this.textSize}px serif`;
        this.width = ctx.measureText(this.name).width;
    }

    draw(ctx) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.beginPath();
        ctx.font = `${this.textSize}px serif`;
        ctx.fillStyle = this.color;
        ctx.fillText(this.name, this.x, this.y);
        // console.log(ctx)
        // console.log(ctx.font)
    }

    offsetPosition(unitX, unitY) {
        let width = this.width;
        let height = this.textSize;

        let offsetX = (unitX * 1.5) * (width / 2);
        let offsetY = (unitY * 1.5) * (height / 2);

        this.x += offsetX;
        this.y += offsetY;
    }

    isHit(mouseX, mouseY) {
        let width = this.width;
        let height = this.textSize;

        let left = this.x - width / 2;
        let right = this.x + width / 2;
        let top = this.y - height / 2;
        let bottom = this.y + height / 2;

        return (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom);
    }

    setName(name, ctx) {
        if (!this.name) return;
        this.name = name;
        if (this.line) {
            this.line.name = name;
        }
        if (this.area) {
            this.area.name = name;
        }
        this.storeWidth(ctx);
    }


}

class Line extends Element {
    constructor(name, x1, y1, x2, y2, color, strokeWeight, ctx) {
        super();
        this.name = name;
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.color = color;
        this.strokeWeight = strokeWeight;
        this.createLabel(ctx);
        Line.lineCount++;
    }

    static lineCount = 0;

    createLabel(ctx) {
        let labelX, labelY, rightX, rightY, leftX, leftY, unitX, unitY;

        if (this.x1 > this.x2) {
            rightX = this.x1;
            rightY = this.y1;
            leftX = this.x2;
            leftY = this.y2;
        } else {
            rightX = this.x2;
            rightY = this.y2;
            leftX = this.x1;
            leftY = this.y1;
        }

        let dx = rightX - leftX;
        let dy = rightY - leftY;

        if (dx == 0) { // vertical line
            labelX = this.x1;
            labelY = Math.min(this.y1, this.y2);
            unitX = 0;
            unitY = -1
        } else { // non-vertical line

            // rightmost point
            labelX = (this.x1 > this.x2) ? this.x1 : this.x2;
            labelY = (this.x1 > this.x2) ? this.y1 : this.y2;

            // Normalize slope vector
            let length = Math.sqrt(dx * dx + dy * dy);
            unitX = dx / length;
            unitY = dy / length;
        }

        this.label = new Label(this.name, labelX, labelY, "black", 24, ctx);
        this.label.deletable = false;
        this.label.line = this;
        this.label.offsetPosition(unitX, unitY);
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.strokeWeight;
        ctx.stroke();
    }

    isHit(mouseX, mouseY) {
        const hitBuffer = 10;
        const distance = pointToSegmentDistance(mouseX, mouseY, this.x1, this.y1, this.x2, this.y2);
        return distance <= hitBuffer;
    }

    drag(dx, dy) {
        this.x1 += dx;
        this.y1 += dy;
        this.x2 += dx;
        this.y2 += dy;

        if (this.label) {
            this.label.drag(dx, dy);
        }
    }
}

class DottedLine extends Line {
    constructor(name, x1, y1, x2, y2, color = "black", strokeWeight = 1, ctx) {
        super(name, x1, y1, x2, y2, color, strokeWeight, ctx);
    }

    createLabel(ctx) {
        let labelX, labelY, bottomX, bottomY, topX, topY, unitX, unitY;

        let dx = this.x2 - this.x1;
        let dy = this.y2 - this.y1;

        if (dx == 0) { // vertical line
            labelX = this.x1;
            labelY = Math.max(this.y1, this.y2);
            unitX = 0;
            unitY = -1;
        } else { // non-vertical line
            if (Math.abs(dy / dx) > 1) {
                if (this.y1 > this.y2) {
                    labelX = this.x1;
                    labelY = this.y1;
                } else {
                    labelX = this.x2;
                    labelY = this.y2;
                    dx *= -1;
                    dy *= -1;
                }
            } else {
                if (this.x1 < this.x1) {
                    labelX = this.x1;
                    labelY = this.y1;
                } else {
                    labelX = this.x2;
                    labelY = this.y2;
                    dx *= -1;
                    dy *= -1;
                }
            }

            // Normalize slope vector
            let length = Math.sqrt(dx * dx + dy * dy);
            unitX = dx / length;
            unitY = dy / length;

        }

        this.label = new Label(this.name, labelX, labelY, "black", 16, ctx);
        this.label.deletable = false;
        this.label.line = this;
        this.label.offsetPosition(-unitX, -unitY);
    }


    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.strokeWeight;
        ctx.stroke();
        ctx.restore();
    }
}

class Arrow extends Line {
    constructor(name, x1, y1, x2, y2, color = "black", strokeWeight = 1, ctx) {
        super(name, x1, y1, x2, y2, color, strokeWeight, ctx);
        this.arrowSize = 10;
    }

    draw(ctx) {
        super.draw(ctx);

        const angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);

        const arrowX1 = this.x2 - this.arrowSize * Math.cos(angle - Math.PI / 6);
        const arrowY1 = this.y2 - this.arrowSize * Math.sin(angle - Math.PI / 6);
        const arrowX2 = this.x2 - this.arrowSize * Math.cos(angle + Math.PI / 6);
        const arrowY2 = this.y2 - this.arrowSize * Math.sin(angle + Math.PI / 6);

        ctx.beginPath();
        ctx.moveTo(this.x2, this.y2);
        ctx.lineTo(arrowX1, arrowY1);
        ctx.lineTo(arrowX2, arrowY2);
        ctx.closePath();

        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();
    }

    createLabel() {
        return; // no default labels for arrows
    }
}

class Area extends Element {
    constructor(name, x, y, color, ctx) {
        super();
        this.name = name;
        this.points = [{ x, y }];
        this.color = color;
        this.drawRadius = 15;
        this.label = null;
        this.createLabel(x, y, ctx);
        Area.allAreas.push(this);
    }

    static allAreas = [];

    createLabel(x, y, ctx) {
        this.label = new Label(this.name, x, y, "black", 24, ctx);
        this.label.deletable = false;
        this.label.area = this;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        for (const point of this.points) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, this.drawRadius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    isHit(x, y) {
        // Simple ray-casting point-in-polygon
        let inside = false;
        for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
            const xi = this.points[i].x, yi = this.points[i].y;
            const xj = this.points[j].x, yj = this.points[j].y;

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi + 0.00001) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    drag(dx, dy) {
        for (const pt of this.points) {
            pt.x += dx;
            pt.y += dy;
        }
        if (this.label) this.label.drag(dx, dy);
    }

    delete() {
        Area.allAreas.splice(Area.allAreas.indexOf(this), 1);
        super.delete();
    }

}


function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}



$(document).ready(function () {

    const $canvas = $("#graph-canvas");
    const canvas = $canvas[0];
    const ctx = canvas.getContext("2d");

    canvas.width = $canvas.width();
    canvas.height = $canvas.height();


    let currentMode = null;
    $("#mode-drag").click(function () {
        resetLineParameters();
        currentMode = "drag";
        $("#color-container").hide();
        $canvas.css("cursor", "move");
    });
    $("#mode-line").click(function () {
        resetLineParameters();
        currentMode = "line";
        lineType = "normal";
        angleInterval = Math.PI / 8;
        $("#color-container").hide();
        $canvas.css("cursor", "crosshair");
    });
    $("#mode-dotted").click(function () {
        resetLineParameters();
        currentMode = "line";
        lineType = "dotted";
        angleInterval = Math.PI / 2;
        $("#color-container").hide();
        $canvas.css("cursor", "crosshair");
    });
    $("#mode-arrow").click(function () {
        resetLineParameters();
        currentMode = "line";
        lineType = "arrow";
        angleInterval = Math.PI / 8;
        $("#color-container").hide();
        $canvas.css("cursor", "crosshair");
    });
    $("#mode-point").click(function () {
        resetLineParameters();
        currentMode = "point";
        $("#color-container").hide();
        $canvas.css("cursor", "auto");
    });
    $("#mode-label").click(function () {
        resetLineParameters();
        currentMode = "label"
        $("#color-container").hide();
        $canvas.css("cursor", "text");
    });
    $("#mode-area").click(function () {
        resetLineParameters();
        currentMode = "area";
        $("#color-container").show();
        $canvas.css("cursor", "cell");
    });
    $("#mode-delete").click(function () {
        resetLineParameters();
        currentMode = "delete";
        $("#color-container").hide();
        $canvas.css("cursor", "auto");

    });
    $("#clear-btn").click(function () {
        resetLineParameters();
        clearGraph();
    });

    $("#color-container").hide();


    // line parameters
    let isDrawingLine = false;
    let lineStartPoint = null;
    let lineEndPoint = null;
    let shiftDown = false;
    let lineType = "normal";
    let angleInterval = Math.PI / 4;
    $(document).keydown(e => { if (e.shiftKey) shiftDown = true; });
    $(document).keyup(e => { if (!e.shiftKey) shiftDown = false; });
    function resetLineParameters() {
        isDrawingLine = false;
        lineStartPoint = null;
        lineEndPoint = null;
    }

    // drag paramters
    let selectedElement = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // area parameters
    let drawingArea = false;
    let currentArea = null;

    $(".color-btn").on("click", function () {
        selectedColor = $(this).data("color");

        $(".color-btn").removeClass("selected");
        $(this).addClass("selected");
    });

    const $firstBtn = $(".color-btn").first();
    $firstBtn.addClass("selected");
    selectedColor = $firstBtn.data("color");


    function debugDraw(x, y, color = "red") {
        const size = 5;
        ctx.fillStyle = color;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }



    function snapToAngle(startPoint, mousePoint) {
        if (shiftDown) {
            let dx = mousePoint.x - startPoint.x;
            let dy = mousePoint.y - startPoint.y;
            let angle = Math.atan2(dy, dx);
            let snappedAngle = Math.round(angle / angleInterval) * angleInterval;
            let length = Math.sqrt(dx * dx + dy * dy);
            mousePoint.x = startPoint.x + Math.cos(snappedAngle) * length;
            mousePoint.y = startPoint.y + Math.sin(snappedAngle) * length;
        }

        return mousePoint;
    }

    function findPointOnLineWithSameAngle(mouseX, mouseY, line) {
        const dy = lineStartPoint.y - mouseY;
        const dx = lineStartPoint.x - mouseX;

        const x1 = line.x1;
        const y1 = line.y1;

        const mx = mouseX;
        const my = mouseY;

        const ldy = line.y2 - line.y1;
        const ldx = line.x2 - line.x1;

        const t = (dy * (x1 - mx) + dx * (my - y1)) / (dx * ldy - dy * ldx);

        if (t < 0 || t > 1) {
            return null;
        }

        const py = y1 + ldy * t;
        const px = x1 + ldx * t;

        return { x: px, y: py };
    }

    function checkAngleInterval(mouseX, mouseY, point) {
        let mdx = mouseX - lineStartPoint.x;
        let mdy = mouseY - lineStartPoint.y;
        let pdx = point.x - lineStartPoint.x;
        let pdy = point.y - lineStartPoint.y;

        if (mdy / mdx == pdy / pdx) {
            return true;
        }
        return false;

        /*
                let dx = point.x - lineStartPoint.x;
        let dy = point.y - lineStartPoint.y;
        debugDraw(point.x, point.y);
        // if (Math.sq(dx) < 100)
        //     console.log(dx + ", " + dy);
        let angle = Math.atan2(dy, dx);
        debugDraw(point.x+dx, point.y);

        let snappedAngle = Math.round(angle / angleInterval) * angleInterval;
        if (angle != snappedAngle) {
            return false;
        }

        // console.log("angle: " + angle)
        // console.log("snap: " + snappedAngle)
        return true;
        */
    }

    function getClosestPointOnLine(mouseX, mouseY, snapToAngle = false) {
        let closestPoint = null;
        let closestDist = Infinity;

        // Check for the closest point on each line
        Element.allElements.forEach(element => {
            if (element instanceof Line) {
                let dist;

                if (snapToAngle) {
                    let point = findPointOnLineWithSameAngle(mouseX, mouseY, element);
                    if (!point) return;
                    dist = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2);
                    if (dist < closestDist) {
                        closestPoint = point;
                        closestDist = dist;
                        pointLine = [element];
                    }
                }

                else {
                    dist = pointToSegmentDistance(mouseX, mouseY, element.x1, element.y1, element.x2, element.y2);
                    if (dist < closestDist) {
                        // Calculate the closest point on the line
                        const t = ((mouseX - element.x1) * (element.x2 - element.x1) + (mouseY - element.y1) * (element.y2 - element.y1)) /
                            ((element.x2 - element.x1) ** 2 + (element.y2 - element.y1) ** 2);

                        const point = {
                            x: element.x1 + t * (element.x2 - element.x1),
                            y: element.y1 + t * (element.y2 - element.y1)
                        };

                        closestPoint = point;
                        closestDist = dist;
                        pointLine = [element];
                    }
                }
            }
        });

        return [closestPoint, closestDist];
    }

    function getIntersection(line1, line2) {
        let x1 = line1.x1, y1 = line1.y1, x2 = line1.x2, y2 = line1.y2;
        let x3 = line2.x1, y3 = line2.y1, x4 = line2.x2, y4 = line2.y2;

        let denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denom === 0) return null; // Lines are parallel or coincident

        let intersectX = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
        let intersectY = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

        // Check if the intersection is within both line segments
        if ((intersectX >= Math.min(x1, x2) && intersectX <= Math.max(x1, x2)) &&
            (intersectY >= Math.min(y1, y2) && intersectY <= Math.max(y1, y2)) &&
            (intersectX >= Math.min(x3, x4) && intersectX <= Math.max(x3, x4)) &&
            (intersectY >= Math.min(y3, y4) && intersectY <= Math.max(y3, y4))) {
            return { x: intersectX, y: intersectY };
        }

        return null;
    }

    function getClosestIntersection(mouseX, mouseY, snapToAngle = false) {
        let closestIntersection = null;
        let closestDist = Infinity;

        for (let i = 0; i < Element.allElements.length; i++) {
            for (let j = i + 1; j < Element.allElements.length; j++) {
                if (Element.allElements[i] instanceof Line && Element.allElements[j] instanceof Line) {
                    let intersection = getIntersection(Element.allElements[i], Element.allElements[j]);
                    if (intersection) {

                        if (snapToAngle && !checkAngleInterval(mouseX, mouseY, intersection)) {
                            continue;
                        }

                        let dist = Math.sqrt((intersection.x - mouseX) ** 2 + (intersection.y - mouseY) ** 2);
                        if (dist < closestDist) {
                            closestIntersection = intersection;
                            closestDist = dist;
                            intersectingLines = [Element.allElements[i], Element.allElements[j]];
                        }
                    }
                }
            }
        }

        return [closestIntersection, closestDist];
    }

    function getClosestPoint(mouseX, mouseY, snapToAngle = false) {
        let closestPoint = null;
        let closestDist = Infinity;

        for (let i = 0; i < Element.allElements.length; i++) {
            if (Element.allElements[i] instanceof Point) {
                let point = Element.allElements[i];

                if (snapToAngle && !checkAngleInterval(mouseX, mouseY, point)) {
                    continue;
                }

                let dist = Math.sqrt((point.x - mouseX) ** 2 + (point.y - mouseY) ** 2);
                if (dist < closestDist) {
                    closestPoint = point;
                    closestDist = dist;
                }
            }

        }

        return [closestPoint, closestDist];

    }

    function getSnapPosition(mouseX, mouseY, allowFreePos, snapToAngle) {
        if (!isDrawingLine) snapToAngle = false;

        let [snapLine, snapLineDist] = getClosestPointOnLine(mouseX, mouseY, snapToAngle);
        let [snapIntersection, snapIntersectionDist] = getClosestIntersection(mouseX, mouseY, snapToAngle);
        let [snapPoint, snapPointDist] = getClosestPoint(mouseX, mouseY, snapToAngle);

        let snapPos;

        if (snapPointDist < 30) {
            snapPos = snapPoint;
        } else if (snapIntersectionDist < 20) {
            snapPos = snapIntersection;
        } else if (snapLineDist < 20) {
            snapPos = snapLine;
        } else {
            if (allowFreePos) {
                snapPos = { x: mouseX, y: mouseY };
            }
            else {
                snapPos = snapLine;
            }
        }


        return snapPos;
    }

    $canvas.click(function (e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        switch (currentMode) {
            case "line":
                lineClick(mouseX, mouseY);
                break;
            case "point":
                pointClick(mouseX, mouseY);
                break;
            case "label":
                labelClick(mouseX, mouseY);
                break;
            case "delete":
                deleteClick(mouseX, mouseY);
                break;
        }
    });

    $canvas.on("mousedown", function (e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        switch (currentMode) {
            case "drag":
                let clicked = Element.allElements.find(element => element.isHit(mouseX, mouseY) && element.draggable)
                if (clicked) {
                    selectedElement = clicked;
                    dragOffsetX = mouseX;
                    dragOffsetY = mouseY;
                }
                break;
            case "area":
                drawingArea = true;
                drawArea(mouseX, mouseY);
                break;

        }
    });

    function drawArea(x, y) {
        if (!drawingArea) {
            return;
        }

        if (!currentArea || currentArea.color != selectedColor) {

            let area = Area.allAreas.find(area => area.color === selectedColor);
            if (area) currentArea = area;
            else {
                createNewArea(x, y);
            }
        } else {

            currentArea.points.push({ x, y });
        }
    }

    function createNewArea(x, y) {
        let area = new Area("Area" + (Area.allAreas.length + 1), x, y, selectedColor, ctx);
        currentArea = area;
    }


    function lineClick(mouseX, mouseY) {
        let allowFreePos = lineType != "dotted";

        if (!isDrawingLine) { // first click
            let point = { x: mouseX, y: mouseY };
            if (lineType != "arrow") {
                point = getSnapPosition(point.x, point.y, allowFreePos, shiftDown);
            }

            isDrawingLine = true;
            lineStartPoint = point;
        } else { // second click
            mousePoint = { x: mouseX, y: mouseY };
            lineEndPoint = snapToAngle(lineStartPoint, mousePoint);

            if (lineType != "arrow") {
                lineEndPoint = getSnapPosition(lineEndPoint.x, lineEndPoint.y, allowFreePos, shiftDown);
            }

            if (lineType == "dotted") {
                new DottedLine(
                    "Dotted Line" + (Line.lineCount - 1),
                    lineStartPoint.x, lineStartPoint.y,
                    lineEndPoint.x, lineEndPoint.y,
                    "black",
                    1,
                    ctx
                );
            }
            else if (lineType == "arrow") {
                new Arrow(
                    "Arrow" + (Line.lineCount - 1),
                    lineStartPoint.x, lineStartPoint.y,
                    lineEndPoint.x, lineEndPoint.y,
                    "black",
                    1,
                    ctx
                );
            }
            else {
                new Line(
                    "Line" + (Line.lineCount - 1),
                    lineStartPoint.x, lineStartPoint.y,
                    lineEndPoint.x, lineEndPoint.y,
                    "black",
                    2,
                    ctx
                );
            }
            drawElements();

            isDrawingLine = false;
        }
    }

    function lineMove(mouseX, mouseY) {
        if (isDrawingLine) {
            ctx.save();
            const mousePoint = { x: mouseX, y: mouseY };
            ctx.beginPath();
            ctx.moveTo(lineStartPoint.x, lineStartPoint.y);
            if (lineType === "dotted") ctx.setLineDash([5, 5]);
            let previewPoint = snapToAngle(lineStartPoint, mousePoint);
            previewPoint = lineType != "arrow" ? getSnapPosition(previewPoint.x, previewPoint.y, lineType != "dotted", shiftDown) : previewPoint;
            ctx.lineTo(previewPoint.x, previewPoint.y);
            ctx.strokeStyle = "gray";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        } else {
            pos = lineType != "arrow" ? getSnapPosition(mouseX, mouseY, lineType != "dotted", shiftDown) : { x: mouseX, y: mouseY };
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(0.05, 0.05, 0.05, 1)";
            ctx.fill();
        }
    }

    function pointClick(mouseX, mouseY) {
        let pos = getSnapPosition(mouseX, mouseY, false);
        new Point(`Point ${Element.allElements.length}`, pos.x, pos.y, "black", []);
        drawElements();
    }

    function labelClick(mouseX, mouseY) {
        let clicked = Element.allElements.find(element => element instanceof Label && element.isHit(mouseX, mouseY));
        if (clicked) {
            let newName = prompt("Enter new label name:", clicked.name);
            if (!newName) newName = clicked.name;
            clicked.setName(newName, ctx);
            drawElements();
        }
        // else {
        //     // New label
        //     let newLabel = new Label("New Label", mouseX, mouseY, "black", 24, ctx);
        //     let newName = prompt("Enter new label name:", newLabel.name);
        //     newLabel.setName(newName, ctx);
        //     drawElements();
        // }
    }

    function labelMove(mouseX, mouseY) {
        if (Element.allElements.some(element => element instanceof Label && element.isHit(mouseX, mouseY))) {
            $canvas.css("cursor", "text");
        } else {
            $canvas.css("cursor", "auto");
        }
    }

    function deleteClick(mouseX, mouseY) {
        let clicked = Element.allElements.find(element => element.isHit(mouseX, mouseY) && element.deletable);
        if (clicked) {
            deleteElement(clicked);
        }
    }

    function deleteMove(mouseX, mouseY) {
        if (Element.allElements.some(element => element.isHit(mouseX, mouseY) && element.deletable)) {
            $canvas.css("cursor", "pointer");
        } else {
            $canvas.css("cursor", "auto");
        }
    }

    function deleteElement(element) {
        if ((element instanceof Line && element.label) || (element instanceof Area && element.label)) {
            deleteElement(element.label);
        }

        if (element instanceof Area) {
            currentArea = null;
        }

        element.delete();
    }

    function undoDelete() {
        const lastDeleted = Element.deletedElements.pop();
        if (lastDeleted) {
            Element.allElements.push(lastDeleted);
            drawElements();
        }
    }

    $("#undo-delete").on("click", function () {
        undoDelete();
    });

    $(document).on("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undoDelete();
        }
    });


    $canvas.mousemove(function (e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        drawElements();

        switch (currentMode) {
            case "line":
                lineMove(mouseX, mouseY);
                break;
            case "drag":
                dragMove(mouseX, mouseY);
                break;
            case "point":
                pointMove(mouseX, mouseY);
                break;
            case "label":
                labelMove(mouseX, mouseY);
                break;
            case "area":
                drawArea(mouseX, mouseY);
                break;
            case "delete":
                deleteMove(mouseX, mouseY);
                break;
        }
    });



    function dragMove(mouseX, mouseY) {
        if (selectedElement) {
            let dx = mouseX - dragOffsetX;
            let dy = mouseY - dragOffsetY;
            selectedElement.drag(dx, dy);
            dragOffsetX = mouseX;
            dragOffsetY = mouseY;
        }
    }

    function pointMove(mouseX, mouseY) {
        pos = getSnapPosition(mouseX, mouseY, false);

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(0.2, 0.2, 0.2, 0.3)";
        ctx.fill();
    }

    $canvas.on("mouseup", function () {
        if (currentMode === "drag") {
            selectedElement = null;
        }
        if (currentMode === "area") {
            drawingArea = false;
        }
    });


    function initiateGraph() {
        axesXPadding = 100;
        axesYPadding = 100;

        xAxis = new Line("xAxis", axesXPadding, canvas.height - axesYPadding, canvas.width - axesXPadding * 2, canvas.height - axesYPadding, "black", 3, ctx);
        yAxis = new Line("yAxis", axesXPadding, axesYPadding, axesXPadding, canvas.height - axesYPadding, "black", 3, ctx);
        xAxis.draggable = false;
        yAxis.draggable = false;
        // xAxis.label.draggable = false;
        // yAxis.label.draggable = false;
        xAxis.deletable = false;
        yAxis.deletable = false;
        xAxis.label.deletable = false;
        yAxis.label.deletable = false;
        xAxis.specialTag = "xAxis";
        yAxis.specialTag = "yAxis";

        let label = new Label("0", axesXPadding - 10, canvas.height - axesYPadding + 10, "black", 24, ctx);
        label.draggable = false;
        label.deletable = false;
    }

    function drawElements() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        Element.allElements.filter(element => element instanceof Area).forEach(element => element.draw(ctx));
        Element.allElements.filter(element => !(element instanceof Area)).forEach(element => element.draw(ctx));
    }

    initiateGraph()
    drawElements();


    function clearGraph() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        Element.allElements = [];
        initiateGraph();
        drawElements();
        Area.allAreas = [];
        currentArea = null;
    }








    const $navbar = $("#navbar");

    $.getJSON("../json/graphData.json", function (data) {
        allGraphs = data["graphs"];

        let lastUnit = null;

        allGraphs.forEach((graph, index) => {
            if (graph["unit"] != lastUnit) {
                const $unitHeader = $("<div>")
                    .addClass("unit-header")
                    .text(graph["unit"]);
                $navbar.append($unitHeader);

                lastUnit = graph.unit;
            }

            const $button = $("<button>")
                .text(graph["name"])
                .addClass("graph-button")
                .click(function () {
                    setCurrentGraph(graph);
                });
            $navbar.append($button);
        });

        // let randomGraph = allGraphs[Math.floor(Math.random() * allGraphs.length)];
        let randomGraph = allGraphs[0];
        setCurrentGraph(randomGraph);
    }).fail(function () {
        console.error("Failed to load graph data.");
    });

    $("#random-graph-btn").click(function () {
        let randomGraph = allGraphs[Math.floor(Math.random() * allGraphs.length)];
        setCurrentGraph(randomGraph);
    });


    function setCurrentGraph(graph) {
        currentGraph = graph;
        $("#title-container h1").text(graph["name"]);
        $("#title-container h2").text(graph["unit"]);
        clearGraph();
        resetLineParameters();
        drawingArea = false;
        currentArea = null;

        const $results = $("#evaluations-container");
        $results.empty();
        $results.hide();
    }

});

let allGraphs = [];
let currentGraph = null;
