$(document).ready(function () {
    const $canvas = $("#graph-canvas");
    const canvas = $canvas[0];
    const ctx = canvas.getContext("2d");

    $("#evaluate-btn").click(function () {
        console.log(currentGraph.criteria);
        console.log(Element.allElements);

        evaluateGraph(Element.allElements, currentGraph.criteria, ctx);
        $('html,body').animate({
            scrollTop: $("#evaluations-container").offset().top},
            'slow');
    });
});

function evaluateGraph(elements, criteria, ctx) {
    let allScores = [];
    for (const criterium in criteria) {
        switch (criterium) {
            case "axes":
                if (!allPriorScoresPassed(allScores)) continue;
                allScores.push(...checkAxes(elements, criteria[criterium]));
                break;
            case "lines":
                // if (!allPriorScoresPassed(allScores)) continue;
                allScores.push(...checkLines(elements, criteria[criterium]));
                break;
            case "intersections":
                if (!allPriorScoresPassed(allScores)) continue;
                allScores.push(...checkIntersections(elements, criteria[criterium]));
                break;
            // case "endpoints":
            //     if (!allPriorScoresPassed(allScores)) continue;
            //     allScores.push(...checkAllEndpoints(elements, criteria[criterium]));
            //     break;
            case "shifts":
                if (!allPriorScoresPassed(allScores)) continue;
                allScores.push(...checkShifts(elements, criteria[criterium]));
                break;
            case "areas":
                if (!allPriorScoresPassed(allScores)) continue;
                allScores.push(...checkAreas(elements, criteria[criterium], ctx));
                break;
        }

    }


    displayResults(allScores);
}

function allPriorScoresPassed(allScores) {
    return allScores.every(score => score.passed);
}

function displayResults(scores) {
    console.log(scores);
    const $results = $("#evaluations-container");
    $results.empty();
    $results.show();

    scores.forEach(score => {
        const $entry = $("<div>").addClass("evaluation-entry");
        // console.log(score);
        if (score.passed) {
            $entry.addClass("passed");
            $entry.text(`✅ ${score.name}`);
        } else {
            $entry.addClass("failed");
            $entry.html(`❌ ${score.name}<br><span class="feedback">${score.feedback}</span>`);
        }

        $results.append($entry);
    });
}

function checkAxes(elements, criteriaAxes) {
    const xAxis = findElementBySpecialTag(elements, "xAxis");
    const yAxis = findElementBySpecialTag(elements, "yAxis");

    let xAxisCorrect = checkName(xAxis.name, criteriaAxes.xAxis);
    let yAxisCorrect = checkName(yAxis.name, criteriaAxes.yAxis);

    let xAxisFeedback = !xAxisCorrect ? `Incorrect name for the x-axis!` : "";
    let yAxisFeedback = !yAxisCorrect ? `Incorrect name for the y-axis!` : "";

    return [
        { name: "x-axis name", passed: xAxisCorrect, feedback: xAxisFeedback },
        { name: "y-axis name", passed: yAxisCorrect, feedback: yAxisFeedback }
    ];
}

function checkLines(elements, criteriaLines) {
    scores = [];

    criteriaLines.forEach(correctLine => {
        let userLine = findElementByName(elements, correctLine.name, Line);
        if (!userLine) {
            if (correctLine.type === "normal") {
                scores.push(
                    {
                        name: `${correctLine.name} curve present`,
                        passed: false,
                        feedback: `${correctLine.name} curve not found!`
                    });
            }
            else {
                scores.push(
                    {
                        name: `${correctLine.name} line present`,
                        passed: false,
                        feedback: `${correctLine.name} line not found!`
                    });
            }
        }
        else if (userLine === "[DEBUG] multiple") {
            if (correctLine.type === "normal") {
                scores.push(
                    {
                        name: `Only 1 ${correctLine.name} curve present`,
                        passed: false,
                        feedback: `Multiple ${correctLine.name} curves found!`
                    });
            }
            else {
                scores.push(
                    {
                        name: `Only 1 ${correctLine.name} line present`,
                        passed: false,
                        feedback: `Multiple ${correctLine.name} lines found!`
                    });
            }
        }
        else {
            if (userLine instanceof DottedLine) {
                if (correctLine.type === "normal") {
                    scores.push(
                        {
                            name: `${correctLine.name} is a solid line`,
                            passed: false,
                            feedback: `${correctLine.name} should not be a dotted line!`
                        });
                    return;
                }
            } else {
                if (correctLine.type === "dotted") {
                    scores.push(
                        {
                            name: `${correctLine.name} is a dotted line`,
                            passed: false,
                            feedback: `${correctLine.name} should not be a solid line!`
                        });
                    return;
                }
            }

            scores.push(
                {
                    name: `${correctLine.name} curve present`,
                    passed: true,
                    feedback: ""
                });
            for (lineCriterium in correctLine) {
                if (lineCriterium === "name") continue;

                switch (lineCriterium) {
                    case "slope":
                        scores.push(...checkSlope(userLine, correctLine));
                        break;
                }
            }
            // TODO: Return pass/fail feedback object
        }
    });


    const userLines = elements.filter(element => element instanceof Line && !(element instanceof Arrow));
    let extraneousLines = userLines.filter(line => {
        const isCorrect = criteriaLines.some(correctLine =>
            checkName(line.name, correctLine.name) || (line.specialTag && (line.specialTag === "xAxis" || line.specialTag === "yAxis"))
        );
        return !isCorrect;
    });
    const extraneousScore = extraneousLines.length > 0;

    extraneousLines = extraneousLines.map(l => l.name);

    const extraneousFeedback = `This graph should not have ${formatListWithAnd(extraneousLines)}!`;
    if (extraneousScore) {
        scores.push({
            name: "No extraneous elements",
            passed: false,
            feedback: extraneousFeedback
        })
    }

    return scores;
}

function checkSlope(userLine, correctLine) {
    const userSlope = getSlope(userLine);

    let steepness = null;
    const correctSteepness = correctLine["slope"]["steepness"];
    if (correctSteepness) {
        let steepnessScore, steepnessFeedback;
        switch (correctSteepness) {
            case "steep":
                steepnessScore = Math.abs(userSlope) >= 2;
                break;
            case "shallow":
                steepnessScore = Math.abs(userSlope) <= 0.5
                break;
            case "vertical":
                steepnessScore = userSlope === Infinity || Math.abs(userSlope) >= 20;
                break;
            case "horizontal":
                // console.log(userSlope);
                steepnessScore = Math.abs(userSlope) <= 0.05;
                break;
        }
        if (correctSteepness == "vertical" || correctSteepness == "horizontal") {
            steepnessFeedback = !steepnessScore ? `${userLine.name} should be ${correctSteepness}!` : "";
        } else {
            steepnessFeedback = !steepnessScore ? `The steepness of ${userLine.name}'s slope is incorrect!` : "";
        }

        steepness = { name: `${userLine.name} slope steepness`, passed: steepnessScore, feedback: steepnessFeedback };
    } else {
        if (userSlope === Infinity) {
            return [{ name: `${userLine.name}'s slope`, passed: false, feedback: `${userLine.name} should not be vertical!` }];
        }
        else if (userSlope === 0) {
            return [{ name: `${userLine.name}'s slope`, passed: false, feedback: `${userLine.name} should not be horizontal!` }];
        }
    }

    let sign = null;
    if (correctLine["slope"]["sign"]) {
        let signScore;
        switch (correctLine["slope"]["sign"]) {
            case "positive":
                signScore = userSlope > 0;
                break;
            case "negative":
                signScore = userSlope < 0;
                break;
            default:
                signScore = true;
                break;
        }
        let signFeedback = !signScore ? `The sign of ${userLine.name}'s slope is incorrect!` : "";

        sign = { name: `${userLine.name} slope sign`, passed: signScore, feedback: signFeedback }
    }

    let returnList = [];

    if (steepness) returnList.push(steepness);
    if (sign) returnList.push(sign);

    return returnList;
}

function getSlope(line) {
    if (line.x1 === line.x2) {
        return Infinity;
    }

    // TODO: Why is the slope negative? (I already added the negative to correct)
    return -(line.y2 - line.y1) / (line.x2 - line.x1);
}

function arraysEqualUnordered(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;

    const allStrings = arr1.every(item => typeof item === 'string') &&
        arr2.every(item => typeof item === 'string');

    if (false && allStrings) {
        const matched = new Array(arr2.length).fill(false);

        for (const item1 of arr1) {
            let found = false;
            for (let i = 0; i < arr2.length; i++) {
                if (!matched[i] && checkName(item1, arr2[i])) {
                    matched[i] = true;
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }

        return true;
    } else {
        // Original logic for non-string values
        const set1 = new Set(arr1);
        const set2 = new Set(arr2);

        if (set1.size !== set2.size) return false;

        for (const item of set1) {
            if (!set2.has(item)) return false;
        }

        return true;
    }
}

function formatListWithAnd(arr) {
    if (arr.length === 0) return '';
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;

    return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

function checkIntersections(elements, criteriaIntersections) {
    const allIntersections = findAllIntersections(elements);
    let scores = [];
    criteriaIntersections.forEach(correctIntersection => {
        let correctLines = [];
        correctIntersection.lines.forEach(line => {
            switch (line) {
                case "xAxis":
                    correctLines.push(findElementBySpecialTag(elements, "xAxis").name);
                    break;
                case "yAxis":
                    correctLines.push(findElementBySpecialTag(elements, "yAxis").name);
                    break;
                default:
                    correctLines.push(line);
                    break;
            }
        });


        // console.log(allIntersections)
        let score = allIntersections.some(int => arraysEqualUnordered(int.lines, correctLines) || arrayContainsArray(int.lines, correctLines));

        let name = `${formatListWithAnd(correctLines)} intersect`;
        let feedback = !score ? `${formatListWithAnd(correctLines)} don't intersect!` : "";

        scores.push({ name: name, passed: score, feedback: feedback });
    });

    return scores;
}

function arrayContainsArray(arr, target) {
    // Clean each element of arr and target using cleanString function
    arr = arr.map(cleanString);
    target = target.map(cleanString);

    // Check if every element in target is included in arr after cleaning
    return target.every(v => arr.includes(v));
}

function findAllIntersections(elements) {
    const threshold = 15;
    let allIntersections = [];

    let lines = elements.filter(element => element instanceof Line && !(element instanceof Arrow));
    for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
            const lineA = lines[i];
            const lineB = lines[j];

            const intersection = calculateIntersection(lineA, lineB);
            if (!intersection) continue;

            let existing = allIntersections.find(entry =>
                Math.abs(entry.point.x - intersection.x) < threshold &&
                Math.abs(entry.point.y - intersection.y) < threshold
            );

            if (existing) {
                if (!existing.lines.includes(lineA.name)) existing.lines.push(lineA.name);
                if (!existing.lines.includes(lineB.name)) existing.lines.push(lineB.name);
            } else {
                allIntersections.push({
                    point: intersection,
                    lines: [lineA.name, lineB.name]
                });
            }
        }
    }
    return allIntersections;
}

function checkShifts(elements, criteriaShifts) {
    let scores = [];
    criteriaShifts.forEach(correctShift => {
        switch (correctShift.line1) {
            case "xAxis":
                correctShift.line1 = findElementBySpecialTag(elements, "xAxis").name;
                break;
            case "yAxis":
                correctShift.line1 = findElementBySpecialTag(elements, "yAxis").name;
                break;
        }
        switch (correctShift.line2) {
            case "xAxis":
                correctShift.line2 = findElementBySpecialTag(elements, "xAxis").name;
                break;
            case "yAxis":
                correctShift.line2 = findElementBySpecialTag(elements, "yAxis").name;
                break;
        }

        let line1 = findElementByName(elements, correctShift.line1, Line);
        let line2 = findElementByName(elements, correctShift.line2, Line);

        let score;
        if (line1 && line2) {
            score = checkLineShift(line1, line2, correctShift.direction);
        }

        scores.push(score);
    });

    return scores;
}

function checkLineShift(line1, line2, direction) {
    if (!compareSlopes(line1, line2)) {
        let name = `${line1.name} and ${line2.name} have the same slope`;
        let feedback = `${line1.name}'s and ${line2.name}'s slopes are different!`;
        return { name: name, passed: false, feedback: feedback };
    }

    const midpoint1 = getMidpoint(line1);
    const midpoint2 = getMidpoint(line2);
    const dx = midpoint2.x - midpoint1.x;
    const dy = midpoint2.y - midpoint1.y;

    let name = `${line2.name} is shifted ${direction} from ${line1.name}`;
    let score;

    switch (direction) {
        case "up":
            score = dy < 0;
            break;
        case "down":
            score = dy > 0;
            break;
        case "right":
            score = dx > 0;
            break;
        case "left":
            score = dx < 0;
            break;
    }

    let feedback = !score ? `${line2.name} isn't shifted ${direction} from ${line1.name}!` : "";

    return { name: name, passed: score, feedback: feedback };
}

function getMidpoint(line) {
    return { x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 };
}

function compareSlopes(line1, line2) {
    const slope1 = getSlope(line1);
    const slope2 = getSlope(line2);

    console.log("comparing slopes:")
    console.log(line1);
    console.log(line2);
    console.log(slope1);
    console.log(slope2);

    if (slope1 === Infinity && slope2 === Infinity) {
        return true;
    }

    if (Math.abs(slope1) > 40 && Math.abs(slope2) > 40) {
        return true;
    }

    let lx1 = (line1.x1 < line1.x2) ? line1.x1 : line1.x2;
    let ly1 = (line1.x1 < line1.x2) ? line1.y1 : line1.y2;

    let rx1 = (line1.x1 < line1.x2) ? line1.x2 : line1.x1;
    let ry1 = (line1.x1 < line1.x2) ? line1.y2 : line1.y1;

    let lx2 = (line2.x1 < line2.x2) ? line2.x1 : line2.x2;
    let ly2 = (line2.x1 < line2.x2) ? line2.y1 : line2.y2;

    let rx2 = (line2.x1 < line2.x2) ? line2.x2 : line2.x1;
    let ry2 = (line2.x1 < line2.x2) ? line2.y2 : line2.y1;

    function calculateAngle(x1, y1, x2, y2) {
        // Calculate the angle in radians using Math.atan2
        return Math.atan2(y2 - y1, x2 - x1);
    }

    let a1 = calculateAngle((rx1 - lx1), (ry1 - ly1));
    let a2 = calculateAngle((rx2 - lx2), (ry2 - ly2));

    console.log(a1);
    console.log(a2);

    const thresholdAngle = 0.261799;
    const thresholdSlope = 0.3;

    const result = Math.abs(a1 - a2) <= thresholdAngle || Math.abs(slope1 - slope2) < thresholdSlope;
    console.log(result);
    console.log("")
    return result;
}

function calculateIntersection(line1, line2) {
    const { x1, y1, x2, y2 } = line1;
    const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2;

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (denominator === 0) {
        // Lines are parallel or coincident
        return null;
    }

    const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator;
    const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator;

    // Optional: Check if intersection is within the segments (not infinite lines)
    if (!isPointOnSegment(px, py, line1) || !isPointOnSegment(px, py, line2)) {
        return null;
    }

    return { x: px, y: py };
}

function checkAllEndpoints(elements, endpointCriteria) {
    let scores = [];
    let allIntersections = findAllIntersections(elements);

    endpointCriteria.forEach(correctEndpoint => {
        switch (correctEndpoint.line) {
            case "xAxis":
                correctEndpoint.line = findElementBySpecialTag(elements, "xAxis").name;
                break;
            case "yAxis":
                correctEndpoint.line = findElementBySpecialTag(elements, "yAxis").name;
                break;
        }
        let line = findElementByName(elements, correctEndpoint.line, Line);

        let name, feedback;

        // first endponit
        let endpoint1Check = null;
        let endpoint1Lines = [];
        if (correctEndpoint.endpoint1) {
            if (correctEndpoint.endpoint1.length === 1) {
                switch (correctEndpoint.endpoint1[0]) {
                    case "xAxis":
                        correctEndpoint.endpoint1[0] = findElementBySpecialTag(elements, "xAxis").name;
                        break;
                    case "yAxis":
                        correctEndpoint.endpoint1[0] = findElementBySpecialTag(elements, "yAxis").name;
                        break;
                }
                let endline1 = findElementByName(elements, correctEndpoint.endpoint1[0], Line);
                endpoint1Check = checkEndpoint(line, endline1);
                endpoint1Lines.push(endline1.name);
            }
            else {
                let testEndpoint1 = [...correctEndpoint.endpoint1, line.name];
                endpointInt = allIntersections.find(int => arraysEqualUnordered(testEndpoint1, int.lines) || arrayContainsArray(int.lines, testEndpoint1));
                if (!endpointInt) return;
                endpointInt.lines.forEach(l => {
                    if (!checkName(l, line.name))
                        endpoint1Lines.push(l);
                });
                const vertexPoint = endpointInt.point;
                endpoint1Check = (comparePoints(vertexPoint.x, vertexPoint.y, line.x1, line.y1) || comparePoints(vertexPoint.x, vertexPoint.y, line.x2, line.y2));
            }
        }

        // second endpoint
        let endpoint2Check = null;
        let endpoint2Lines = [];
        if (correctEndpoint.endpoint2) {
            if (correctEndpoint.endpoint2.length === 1) {
                switch (correctEndpoint.endpoint2[0]) {
                    case "xAxis":
                        correctEndpoint.endpoint2[0] = findElementBySpecialTag(elements, "xAxis").name;
                        break;
                    case "yAxis":
                        correctEndpoint.endpoint2[0] = findElementBySpecialTag(elements, "yAxis").name;
                        break;
                }
                let endline2 = findElementByName(elements, correctEndpoint.endpoint2[0], Line);
                endpoint2Check = checkEndpoint(line, endline2);
                endpoint2Lines.push(endline2.name);
            }
            else {
                // console.log(correctEndpoint.endpoint2);
                // console.log(allIntersections)
                let testEndpoint2 = [...correctEndpoint.endpoint2, line.name];
                endpointInt = allIntersections.find(int => arraysEqualUnordered(testEndpoint2, int.lines) || arrayContainsArray(int.lines, testEndpoint2));
                if (!endpointInt) return;
                endpointInt.lines.forEach(l => {
                    if (!checkName(l, line.name))
                        endpoint2Lines.push(l);
                });
                const vertexPoint = endpointInt.point;
                endpoint2Check = (comparePoints(vertexPoint.x, vertexPoint.y, line.x1, line.y1) || comparePoints(vertexPoint.x, vertexPoint.y, line.x2, line.y2));
            }
        }

        let score = endpoint1Check && endpoint2Check;

        // console.log(endpoint1Lines);
        // console.log(endpoint2Lines);

        // console.log(endpoint1Check);
        // console.log(endpoint2Check);


        if (endpoint2Check != null) {
            name = `${line.name} has correct endpoints`;
            feedback = !score ? `${line.name} should go from ${formatListWithAnd(endpoint1Lines)} to ${formatListWithAnd(endpoint2Lines)}!` : "";
        }
        else {
            name = `${line.name} had the correct endpoint`;
            feedback = !score ? `${line.name} should end at ${formatListWithAnd(endpoint1Lines)}!` : "";

        }

        scores.push({ name: name, passed: score, feedback: feedback });
    });

    return scores;
}

function comparePoints(x1, y1, x2, y2) {
    return (Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2) < 10);
}

function checkEndpoint(line, endpoint) {
    return (isPointOnSegment(line.x1, line.y1, endpoint) || isPointOnSegment(line.x2, line.y2, endpoint));
}

function checkEndpoints(line, endpoint1, endpoint2) {
    if (isPointOnSegment(line.x1, line.y1, endpoint1) && isPointOnSegment(line.x2, line.y2, endpoint2)) return true;
    if (isPointOnSegment(line.x2, line.y2, endpoint1) && isPointOnSegment(line.x1, line.y1, endpoint2)) return true;
    return false;
}

function isPointOnSegment(px, py, line) {
    const minX = Math.min(line.x1, line.x2);
    const maxX = Math.max(line.x1, line.x2);
    const minY = Math.min(line.y1, line.y2);
    const maxY = Math.max(line.y1, line.y2);

    const threshold = 15; // allow small floating point error
    return px >= minX - threshold && px <= maxX + threshold && py >= minY - threshold && py <= maxY + threshold;
}

function findElementBySpecialTag(elements, specialTag) {
    return elements.find(element => element.specialTag === specialTag);
}

function findElementByName(elements, targetName, elementType) {
    const matches = elements.filter(element => element instanceof elementType && checkName(element.name, targetName));

    if (matches.length === 0) {
        return null;
    } else if (matches.length > 1) {
        return "[DEBUG] multiple";
    } else {
        return matches[0];
    }
}

function checkName(testName, correctName) {
    testName = cleanString(testName);
    correctName = cleanString(correctName);

    if (correctName === "quantity()") {
        return /^quantity\(.+\)$/.test(testName);
    }

    return cleanString(testName) === cleanString(correctName);
}

function cleanString(string) {
    return string
        .normalize('NFD')                        // Normalize Unicode
        .replace(/[\u0300-\u036f]/g, '')          // Remove diacritics (accents)
        .replace(/\p{Zs}+/gu, ' ')                // Normalize any whitespace to a single space
        .replace(/['"‘’“”]/g, '')                 // Remove quotes (curly or straight)
        .replace(/['"‘’“”]/g, '')                 // Remove quotes (curly or straight)
        .replace("qe", 'q')                       // pe to p
        .replace("pe", 'p')                      //qe to q                
        // .replace(/[^a-z0-9\s]/gi, '')             // Remove non-alphanumeric characters except spaces
        .toLowerCase()                            // Convert to lowercase
        .trim()                                   // Trim again after other cleaning
        .replace(/\s+/g, ' ')                     // Collapse any repeated spaces
        .split(' ')                               // Optionally: split into words
        // .sort()                                   // Sort words alphabetically
        .join('');                                // Join without spaces for strict comparison
}




function countColorInPolygon(polygonPoints, targetColor, ctx) {
    const $canvas = $("#graph-canvas");
    const canvas = $canvas[0];
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let insideCount = 0;
    let outsideCount = 0;
    let totalInsidePixels = 0;

    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const num = parseInt(hex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    // If a string is passed, convert it
    if (typeof targetColor === 'string') {
        targetColor = hexToRgb(targetColor);
    }

    // Helper: Check if a point is inside the polygon using ray-casting algorithm
    function isPointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];

            if (isPointInPolygon(x, y, polygonPoints)) {
                totalInsidePixels++;
            }

            if (r === targetColor.r && g === targetColor.g && b === targetColor.b && a > 0) {
                const isInside = isPointInPolygon(x, y, polygonPoints);
                if (isInside) {
                    insideCount++;
                } else {
                    outsideCount++;
                }
            }
        }
    }

    const colorCoveragePercentage = (insideCount / totalInsidePixels) * 100;

    return { insideCount, outsideCount, colorCoveragePercentage };
}

function checkAreas(elements, areaCriteria, ctx) {
    let allIntersections = findAllIntersections(elements);
    let scores = [];
    areaCriteria.forEach(correctArea => {
        let correctIntersections = [];
        correctArea.vertices.forEach(vertex => {
            let intersection = [];
            vertex.forEach(line => {
                switch (line) {
                    case "xAxis":
                        intersection.push(findElementBySpecialTag(elements, "xAxis").name);
                        break;
                    case "yAxis":
                        intersection.push(findElementBySpecialTag(elements, "yAxis").name);
                        break;
                    default:
                        intersection.push(findElementByName(elements, line, Line).name);
                        break;
                }
            });
            correctIntersections.push(intersection);
        });

        scores.push(...checkArea(elements, allIntersections, correctIntersections, correctArea.name, ctx));
    });

    return scores;
}

function checkArea(elements, userIntersections, correctIntersections, name, ctx) {
    let scores = [];
    const userArea = findElementByName(elements, name, Area);
    if (!userArea) {
        scores.push(
            {
                name: `${name} area present`,
                passed: false,
                feedback: `${name} area not found!`
            });
    }
    else if (userArea === "[DEBUG] multiple") {
        scores.push(
            {
                name: `Only 1 ${name} area present`,
                passed: false,
                feedback: `Multiple ${name} areas found!`
            });

    }
    else {
        const userAreaColor = userArea.color;
        const polygon = getPolygonFromIntersections(userIntersections, correctIntersections);
        const result = countColorInPolygon(polygon, userAreaColor, ctx);

        // debugPolygon(polygon, ctx);

        const colorPercentage = result.colorCoveragePercentage;
        const totalOutside = result.outsideCount;

        let nameInside = `${name} area is correctly filled`;
        let nameOutide = `${name} area is correctly contained`;

        let scoreInside = colorPercentage > 40;
        let scoreOutside = totalOutside < 8000;

        const allAdjacentLines = [...new Set((correctIntersections).flat())];

        let feedbackInside = !scoreInside ? `The ${name} area should cover the whole area inside ${formatListWithAnd(allAdjacentLines)}!` : "";
        let feedbackOutside = !scoreOutside ? `The ${name} area should be contained by ${formatListWithAnd(allAdjacentLines)}!` : "";

        scores.push(
            {
                name: nameInside,
                passed: scoreInside,
                feedback: feedbackInside
            },
        );

        if (scoreInside) {
            scores.push(
                {
                    name: nameOutide,
                    passed: scoreOutside,
                    feedback: feedbackOutside
                });
        }
    }

    return scores;
}

function getPolygonFromIntersections(userIntersections, correctIntersections) {
    let polygon = [];
    console.log(userIntersections);
    console.log(correctIntersections);
    correctIntersections.forEach(correctInt => {
        const userVertex = userIntersections.find(userInt => arraysEqualUnordered(correctInt, userInt.lines) || arrayContainsArray(userInt.lines, correctInt));
        console.log(userVertex);
        const vertexPoint = userVertex.point;
        polygon.push(vertexPoint);
    });
    return polygon;
}


function debugPolygon(polygon, ctx) {
    let coord1 = polygon[0];
    let area = new Area("debug", coord1.x, coord1.y, "FF0000", ctx)
    area.points = polygon;
    console.log(area);
}

function debugLabel(text, ctx) {
    let label = new Label(text, 50, 50, "red", 20, ctx);
}
