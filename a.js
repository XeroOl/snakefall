var canvas = document.getElementById("canvas");

var SPACE = 0;
var WALL = 1;
var SPIKE = 2;
var EXIT = 3;

var cardinalDirections = [
  {r: 1, c: 0, forwards:"v", backwards:"^"},
  {r:-1, c: 0, forwards:"^", backwards:"v"},
  {r: 0, c: 1, forwards:">", backwards:"<"},
  {r: 0, c:-1, forwards:"<", backwards:">"},
];

var level1 = {
  map: [
    "                    ",
    "                    ",
    "         @          ",
    "                    ",
    "                    ",
    "      AA    BB      ",
    "      A$    $B      ",
    "         %          ",
    "         %          ",
    "         %          ",
  ],
  objects: {
    "A": {
      type: "snake",
      shape: [
        ">@",
        "^ ",
      ],
    },
    "B": {
      type: "snake",
      shape: [
        "@<",
        " ^",
      ],
    },
  },
};
var tileSize = 30;
var level;
var unmoveBuffer = [];
loadLevel(level1);
function loadLevel(serialLevel) {
  var result = {
    map: [],
    objects: [],
    width: null,
    height: null,
  };
  validateSerialRectangle(result, serialLevel.map);
  var objectsByKey = {};
  var snakeCount = 0;
  serialLevel.map.forEach(function(row, r) {
    row.split("").forEach(function(tileCode, c) {
      if (tileCode === " ") {
        result.map.push(SPACE);
      } else if (tileCode === "%") {
        result.map.push(WALL);
      } else if (tileCode === "#") {
        result.map.push(SPIKE);
      } else if (tileCode === "@") {
        result.map.push(EXIT);
      } else if (tileCode === "$") {
        result.map.push(SPACE);
        result.objects.push(newFruit(r, c));
      } else if (/[A-Za-z]/.test(tileCode)) {
        result.map.push(SPACE);
        var object = objectsByKey[tileCode];
        if (object == null) {
          objectsByKey[tileCode] = object = newObject(r, c, serialLevel.objects[tileCode]);
          result.objects.push(object);
        } else {
          // TODO: check the shape
        }
      } else {
        throw asdf;
      }
    });
  });

  level = result;
  canvas.width = tileSize * level.width;
  canvas.height = tileSize * level.height;
  pushUnmoveFrame();
  return;

  function newFruit(r, c) {
    return {
      type: "fruit",
      locations: [getLocation(result, r, c)],
    };
  }
  function newObject(r, c, serialObjectSpec) {
    // TODO: align c backwards for shapes that have space in the upper-left corner
    var type;
    var snakeIndex = null;
    if (serialObjectSpec.type === "snake") {
      type = "snake";
      snakeIndex = snakeCount;
      snakeCount++;
    } else {
      throw asdf;
    }
    var shapeProperties = {width: null, height: null};
    validateSerialRectangle(shapeProperties, serialObjectSpec.shape);
    var localLocations = [];
    var node = findHead();
    localLocations.push(node);
    while (true) {
      if (localLocations.length >= shapeProperties.height * shapeProperties.width) throw asdf;
      node = findNextSegment(node);
      if (node == null) break;
      localLocations.push(node);
    }
    var locations = localLocations.map(function(node) {
      return getLocation(result, r + node.r, c + node.c);
    });
    return {
      type: type,
      locations: locations,
      snakeIndex: snakeIndex,
    };

    function findHead() {
      for (var r = 0; r < serialObjectSpec.shape.length; r++) {
        var row = serialObjectSpec.shape[r];
        for (var c = 0; c < row.length; c++) {
          if (row[c] === "@") return {r:r, c:c};
        }
      }
      throw asdf;
    }
    function findNextSegment(fromNode) {
      for (var i = 0; i < cardinalDirections.length; i++) {
        var node = {r:cardinalDirections[i].r + fromNode.r, c:cardinalDirections[i].c + fromNode.c};
        if (node.c < 0 || node.c >= shapeProperties.width) continue;
        if (node.r < 0 || node.r >= shapeProperties.height) continue;
        var shapeCode = serialObjectSpec.shape[node.r][node.c];
        if (shapeCode === cardinalDirections[i].backwards) return node;
      }
      return null;
    }
  }
}

function pushUnmoveFrame() {
  if (unmoveBuffer.length !== 0) {
    if (deepEquals(JSON.parse(unmoveBuffer[unmoveBuffer.length - 1]), level.objects)) return;
  }
  unmoveBuffer.push(JSON.stringify(level.objects));
}
function unmove() {
  if (unmoveBuffer.length <= 1) return;
  unmoveBuffer.pop(); // that was the current state
  level.objects = JSON.parse(unmoveBuffer[unmoveBuffer.length - 1]);
  render();
}

function deepEquals(a, b) {
  if (a == null) return b == null;
  if (typeof a === "string" || typeof a === "number") return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i])) return false;
    }
    return true;
  }
  // must be objects
  var aKeys = Object.keys(a);
  var bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  aKeys.sort();
  bKeys.sort();
  if (!deepEquals(aKeys, bKeys)) return false;
  for (var i = 0; i < aKeys.length; i++) {
    if (!deepEquals(a[aKeys[i]], b[bKeys[i]])) return false;
  }
  return true;
}

function validateSerialRectangle(outProperties, table) {
  outProperties.height = table.length;
  table.forEach(function(row) {
    if (outProperties.width === null) {
      outProperties.width = row.length;
    } else {
      if (outProperties.width !== row.length) throw asdf;
    }
  });
}

function getLocation(level, r, c) {
  if (!isInBounds(level, r, c)) throw asdf;
  return r * level.width + c;
}
function getRowcol(level, location) {
  if (location < 0 || location >= level.width * level.height) throw asdf;
  var r = Math.floor(location / level.width);
  var c = location % level.width;
  return {r:r, c:c};
}
function isInBounds(level, r, c) {
  if (c < 0 || c >= level.width) return false;;
  if (r < 0 || r >= level.height) return false;;
  return true;
}

document.addEventListener("keydown", function(event) {
  if (event.shiftKey || event.ctrlKey || event.altKey) return;
  if (event.keyCode > 90) return;
  event.preventDefault();
  switch (event.keyCode) {
    case 37: // left
      move(0, -1);
      break;
    case 38: // up
      move(-1, 0);
      break;
    case 39: // right
      move(0, 1);
      break;
    case 40: // down
      move(1, 0);
      break;
    case 8:  // backspace
      unmove();
      break;
    case 32: // space
    case 9:  // tab
      activeSnake = (activeSnake + 1) % countSnakes();
      break;
  }
  render();
});

function move(dr, dc) {
  var snake = findActiveSnake();
  var headRowcol = getRowcol(level, snake.locations[0]);
  var newRowcol = {r:headRowcol.r + dr, c:headRowcol.c + dc};
  if (!isInBounds(level, newRowcol.r, newRowcol.c)) return;
  var newLocation = getLocation(level, newRowcol.r, newRowcol.c);
  var ate = false;

  var newTile = level.map[newLocation];
  if (!(newTile === SPACE || newTile === EXIT)) return;
  var otherObject = findObjectAtLocation(newLocation);
  if (otherObject != null) {
    if (otherObject.type !== "fruit") return;
    // eat
    removeObject(otherObject);
    ate = true;
  }

  // move to empty space
  snake.locations.unshift(newLocation);
  if (!ate) {
    snake.locations.pop();
  }

  // check for exit
  if (newTile === EXIT) {
    removeObject(snake);
    var snakeCount = 0;
    // reindex snakes
    for (var i = 0; i < level.objects.length; i++) {
      var object = level.objects[i];
      if (object.type === "snake") {
        object.snakeIndex = snakeCount;
        snakeCount++;
      }
    }
    if (snakeCount === 0) {
      render();
      alert("you win!");
      // TODO: reset();
    } else {
      if (activeSnake === snakeCount) {
        activeSnake = 0;
      }
    }
  }

  pushUnmoveFrame();
  render();
}

function removeObject(object) {
  var index = level.objects.indexOf(object);
  level.objects.splice(index, 1);
}
function findActiveSnake() {
  for (var i = 0; i < level.objects.length; i++) {
    var object = level.objects[i];
    if (object.type === "snake" && object.snakeIndex === activeSnake) return object;
  }
  throw asdf;
}
function findObjectAtLocation(location) {
  for (var i = 0; i < level.objects.length; i++) {
    var object = level.objects[i];
    if (object.locations.indexOf(location) !== -1)
      return object;
  }
  return null;
}
function countFruit() {
  return countObjectsOfType("fruit");
}
function countSnakes() {
  return countObjectsOfType("snake");
}
function countObjectsOfType(type) {
  var count = 0;
  for (var i = 0; i < level.objects.length; i++) {
    var object = level.objects[i];
    if (object.type === type) count++;
  }
  return count;
}

var snakeColors = [
  "#f00",
  "#0f0",
];

var activeSnake = 0;

function render() {
  var context = canvas.getContext("2d");
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (var r = 0; r < level.height; r++) {
    for (var c = 0; c < level.width; c++) {
      var tileCode = level.map[getLocation(level, r, c)];
      switch (tileCode) {
        case SPACE:
          break;
        case WALL:
          drawRect(r, c, "#fff");
          break;
        case EXIT:
          var radiusFactor = countFruit() === 0 ? 1.2 : 0.7;
          drawQuarterPie(r, c, radiusFactor, "#f00", 0);
          drawQuarterPie(r, c, radiusFactor, "#0f0", 1);
          drawQuarterPie(r, c, radiusFactor, "#00f", 2);
          drawQuarterPie(r, c, radiusFactor, "#ff0", 3);
          break;
        default: //throw asdf;
      }
    }
  }

  level.objects.forEach(function(object) {
    switch (object.type) {
      case "snake":
        var lastRowcol = null
        object.locations.forEach(function(location) {
          var rowcol = getRowcol(level, location);
          if (lastRowcol == null) {
            // head
            if (activeSnake === object.snakeIndex) {
              drawRect(rowcol.r, rowcol.c, "#888");
            }
            drawDiamond(rowcol.r, rowcol.c, snakeColors[object.snakeIndex]);
          } else {
            // tail segment
            var color = snakeColors[object.snakeIndex];
            drawTriangle(rowcol.r, rowcol.c, color, getDirectionFromDifference(lastRowcol, rowcol));
          }
          lastRowcol = rowcol;
        });
        break;
      case "fruit":
        var rowcol = getRowcol(level, object.locations[0]);
        drawCircle(rowcol.r, rowcol.c, "#f0f");
        break;
      default: throw asdf;
    }
  });

  function drawQuarterPie(r, c, radiusFactor, fillStyle, quadrant) {
    var cx = (c + 0.5) * tileSize;
    var cy = (r + 0.5) * tileSize;
    context.fillStyle = fillStyle;
    context.beginPath();
    context.moveTo(cx, cy);
    context.arc(cx, cy, radiusFactor * tileSize/2, quadrant * Math.PI/2, (quadrant + 1) * Math.PI/2);
    context.fill();
  }
  function drawDiamond(r, c, fillStyle) {
    var x = c * tileSize;
    var y = r * tileSize;
    context.fillStyle = fillStyle;
    context.beginPath();
    context.moveTo(x + tileSize/2, y);
    context.lineTo(x + tileSize, y + tileSize/2);
    context.lineTo(x + tileSize/2, y + tileSize);
    context.lineTo(x, y + tileSize/2);
    context.lineTo(x + tileSize/2, y);
    context.fill();
  }
  function drawCircle(r, c, fillStyle) {
    context.fillStyle = fillStyle;
    context.beginPath();
    context.arc((c + 0.5) * tileSize, (r + 0.5) * tileSize, tileSize/2, 0, 2*Math.PI);
    context.fill();
  }
  function drawRect(r, c, fillStyle) {
    context.fillStyle = fillStyle;
    context.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
  }
  function drawTriangle(r, c, fillStyle, tileCode) {
    var x = c * tileSize;
    var y = r * tileSize;
    var points;
    switch (tileCode) {
      case "^":
        points = [
          [x + tileSize/2, y],
          [x + tileSize, y + tileSize],
          [x, y + tileSize],
        ];
        break;
      case "v":
        points = [
          [x + tileSize/2, y + tileSize],
          [x + tileSize, y],
          [x, y],
        ];
        break;
      case ">":
        points = [
          [x, y],
          [x + tileSize, y + tileSize/2],
          [x, y + tileSize],
        ];
        break;
      case "<":
        points = [
          [x + tileSize, y],
          [x, y + tileSize/2],
          [x + tileSize, y + tileSize],
        ];
        break;
      default: throw asdf;
    }

    context.fillStyle = fillStyle;
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    context.lineTo(points[1][0], points[1][1]);
    context.lineTo(points[2][0], points[2][1]);
    context.lineTo(points[0][0], points[0][1]);
    context.fill();
  }
}

function getDirectionFromDifference(toRowcol, fromRowcol) {
  var dr = toRowcol.r - fromRowcol.r;
  var dc = toRowcol.c - fromRowcol.c;
  if      (dr ===  0 && dc ===  1) return ">";
  else if (dr ===  0 && dc === -1) return "<";
  else if (dr ===  1 && dc ===  0) return "v";
  else if (dr === -1 && dc ===  0) return "^";
  else throw asdf;
}

render();
