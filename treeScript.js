/**
 * Driver script for tree editor 
 */

PRINT_DEBUG = true;
let nextConnectorId = 0;
let nextNodeId = 0;

//holds id of the connector which is following the cursor. -1 means no follow
let followingConnector = -1;
let hoveredConnector = -1;
let followingNode = -1;

//holds all connections known by the document
let connections = []

//holds drag offset of node
let nodeDragOffset = new DOMPoint(0, 0);

/**
 * Prints a message to the console if PRINT_DEBUG is true
 * @param msg The message to print
 */
function printDebug(msg) {
    if(PRINT_DEBUG) {
        console.log(msg);
    }
}

/**
 * Returns whether or not an element exists.
 * @param {*} id The ID of the element to check for
 * @returns true if an element with the specified id exists, false otherwise
 */
function elementExists(id) {
    return id != null && document.getElementById(id) != null;
}

function pxStrToInt(val) {
    // return val.replace("px", "");
    return parseInt(val);
}

function connectorIdStringToInt(str) {
    // return str.replace("connector_", "");
    return parseInt(str.replace("connector_", ""));
}

/**
 * Gets a new, unique connector id
 * @returns The next available connector ID
 */
function getNextConnectorId() {
    return nextConnectorId++;
}

function getNextNodeId() {
    return nextNodeId++;
}

/**
 * Initializes a new connection variable.
 * @param {*} fromConnectorId The parent connector
 * @param {*} toConnectorId The child connector
 * @returns A struct containing the information
 */
function createNewConnection(fromConnectorId, toConnectorId) {
    return {from: fromConnectorId, to: toConnectorId};
}

/**
 * Gets the name of a connector
 * @param {*} connectorId The connector ID to get the name of 
 * @returns The name of a connector with the specified ID
 */
function getConnectorName(connectorId) {
    return "connector_" + connectorId;
}

function getNodeName(nodeId) {
    return "node_" + nodeId;
}

/**
 * Gets the name of a connection.
 * @param {*} connection The connection to stringify
 * @returns The string name of the connection.
 */
function getConnectionName(connection) {
    return "connection_" + connection.from + "_" + connection.to;
}

/**
 * Finds and returns all connections from the specified connector
 * @param {*} connectorId The ID of the connector to use.
 * @returns All connections initiating from the connector with the specified ID.
 */
function findConnectionsFrom(connectorId) {
    let connectionsFrom = [];
    for(let i = 0; i < connections.length; i++) {
        if(connections[i].from == connectorId) {
            connectionsFrom.push(connections[i]);
        }
    }

    return connectionsFrom;
}

/**
 * Finds and returns the connection, if any, ending at the specified connector.
 * @param {*} connectorId The ID of the connector to use.
 * @returns The connection ending at the connector with the specified ID, or null
 *          if none was found.
 */
function findConnectionTo(connectorId) {
    for(let i = 0; i < connections.length; i++) {
        if(connections[i].to == connectorId) {
            return connections[i];
        }
    }

    return null;
}

/**
 * Gets whether or not a connection to a connector exists.
 * @param {*} connectorId The ID of the connector to check
 * @returns true if a connection exists that ends with the connector, false otherwise.
 */
function connectionToIdExists(connectorId) {
    return findConnectionTo(connectorId) != null;
}


/**
 * Gets whether or not a connection exists.
 * @param {} connection The connection to test
 * @returns true if the connection exists, false otherwise.
 */
function connectionExists(connection) {
    return connections.indexOf(connection) != -1;
}

/**
 * TODO
 * @param {*} connectorId 
 * @returns Parent node of connection or null if none found.
 */
function findConnectorsParentNode(connectorId) {
    elementId = getConnectorName(connectorId);
    if(!elementExists(elementId)) {
        printDebug("Cannot find parent node of connector " + connectorId + " because its element does not exist.");
        return null;
    }

    parent = document.getElementById(elementId).parentElement;
    return parent.id;
}

/**
 * Creates a new draggable connector, adds it to the document,
 * and returns its unique ID
 * @param {*} x The x-coordinate of the new draggable connector
 * @param {*} y The y-coordinate of the new draggable connector
 * @returns The unique ID of the draggable connector
 */
function addNewDraggableConnector(x, y) {
    let newConnectorId = getNextConnectorId();

    let newElement = document.createElement("div");
    
    newElement.draggable = false; //we will make it manually draggable
    newElement.className = "dot";
    newElement.style.position = "absolute";
    newElement.style.top = (y - 7) + "px";
    newElement.style.left = (x - 7) + "px";
    newElement.id = getConnectorName(newConnectorId);

    newElement.addEventListener("mouseup", e => {
        draggableConnectorMouseUpCb(newConnectorId, e.clientX, e.clientY);
    });
      
    document.body.appendChild(newElement);

    return newConnectorId;
}

/**
 * Gets the center point of an element.
 * @param {*} elemId The ID of the element to compute
 * @returns The center point of the element with the specified ID.
 */
function getCenterPointOfElement(elemId) {
    let elemRect = document.getElementById(elemId).getBoundingClientRect();
    let pt = new DOMPoint(elemRect.x + elemRect.width / 2, elemRect.y + elemRect.height / 2);
    return pt;
}

/**
 * Creates a clone of a point.
 * @param {*} point The point to clone
 * @returns A clone of the given point
 */
function clonePoint(point) {
    newPt = new DOMPoint(point.x, point.y);
    return newPt;
}

/**
 * Gets the minimally bounding rect containing both elements
 * @param {*} elem1Id ID of one of the elements
 * @param {*} elem2Id ID of the other element
 * @returns The bounding rect containing the two elements.
 */
function getBoundingBoxContainingElements(elem1Id, elem2Id) {
    let elem1Rect = document.getElementById(elem1Id).getBoundingClientRect();
    let elem2Rect = document.getElementById(elem2Id).getBoundingClientRect();

    let elem1MaxX = elem1Rect.x + elem1Rect.width;
    let elem1MaxY = elem1Rect.y + elem1Rect.height;
    let elem2MaxX = elem2Rect.x + elem2Rect.width;
    let elem2MaxY = elem2Rect.y + elem2Rect.height;

    let minX = (elem1Rect.x < elem2Rect.x ? elem1Rect.x : elem2Rect.x);
    let minY = (elem1Rect.y < elem2Rect.y ? elem1Rect.y : elem2Rect.y);
    let maxX = (elem1MaxX > elem2MaxX ? elem1MaxX : elem2MaxX);
    let maxY = (elem1MaxY > elem2MaxY ? elem1MaxY : elem2MaxY);

    let width = maxX - minX;
    let height = maxY - minY;
    let newRect = new DOMRect(
        Math.round(minX),
        Math.round(minY),
        Math.round(width),
        Math.round(height));

    return newRect;
}

/**
 * Draws a line connecting two connectors.
 * @param {*} connection The connection to draw.
 */
function drawConnection(connection) {
    //check that each connector in the connection exists
    if(!elementExists(getConnectorName(connection.from))) {
        printDebug("Cannot draw connection because the from connector (" + connection.from + ") does not exist.");
        return;
    }

    if(!elementExists(getConnectorName(connection.to))) {
        printDebug("Cannot draw connection because the to connector (" + connection.to + ") does not exist.");
        return;
    }
    
    let connectionElementId = getConnectionName(connection);
    
    //create the element if it does not exist
    if(!elementExists(connectionElementId)) {
        let newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        newSvg.id = connectionElementId;
        document.body.appendChild(newSvg);
    }

    //can assume all elements exists. now position and resize the svg properly
    let boundsOfBothConnectors = getBoundingBoxContainingElements(getConnectorName(connection.from), getConnectorName(connection.to));

    let connectionElement = document.getElementById(connectionElementId);
    connectionElement.style.position = "absolute";
    connectionElement.style.left = boundsOfBothConnectors.x + "px";
    connectionElement.style.top = boundsOfBothConnectors.y + "px";
    connectionElement.setAttribute("width", boundsOfBothConnectors.width);
    connectionElement.setAttribute("height",  boundsOfBothConnectors.height);
    connectionElement.style.zIndex = -5;

    //determine points to use in beizer curve
    let delta = boundsOfBothConnectors.height / 5;

    //get location of the from point
    let splinePt1 = getCenterPointOfElement(getConnectorName(connection.from));

    //convert to svg frame
    splinePt1.x -= boundsOfBothConnectors.x;
    splinePt1.y -= boundsOfBothConnectors.y;

    //point to guide curve
    let splinePt2 = clonePoint(splinePt1);
    splinePt2.y += delta;

    //midpoint of spline
    let splinePt3 = new DOMPoint(boundsOfBothConnectors.x + boundsOfBothConnectors.width / 2,
                                 boundsOfBothConnectors.y + boundsOfBothConnectors.height / 2);

    splinePt3.x -= boundsOfBothConnectors.x;
    splinePt3.y -= boundsOfBothConnectors.y;

    //get location of the two point in svg frame
    let splinePt4 = getCenterPointOfElement(getConnectorName(connection.to));
    splinePt4.x -= boundsOfBothConnectors.x;
    splinePt4.y -= boundsOfBothConnectors.y;

    let splinePt5 = clonePoint(splinePt4);
    splinePt5.y -= delta;

    //edit svg to draw path
    //https://www.w3schools.com/graphics/svg_path.asp
    if(!connectionElement.querySelector("path")) {
        let newRect = document.createElementNS("http://www.w3.org/2000/svg", "path");
        connectionElement.appendChild(newRect);
    }

    let connectionPath = connectionElement.querySelector("path");
    let pathDesc = "M " + splinePt1.x + " " + splinePt1.y +  //starting point
                    " Q " + splinePt2.x + " " + splinePt2.y + " " + splinePt3.x + " " + splinePt3.y + //first segment
                    " M " + splinePt4.x + " " + splinePt4.y + 
                    " Q " + splinePt5.x + " " + splinePt5.y + " " + splinePt3.x + " " + splinePt3.y   //second segment;
    connectionPath.setAttribute("d", pathDesc);
    connectionPath.setAttribute("stroke", "red");
    connectionPath.setAttribute("stroke-width", 3);
    connectionPath.setAttribute("fill", "none");
}

function eraseConnection(connection) {
    let connectionName = getConnectionName(connection);

    if(!connectionExists(connection)) {
        printDebug("Cannot erase connection " + connectionName + " because it does not exist.");
        return;
    }

    if(elementExists(connectionName)) {
        document.getElementById(connectionName).remove();
    }

    //remove element from array
    let connIdx = connections.indexOf(connection);
    connections.splice(connIdx, 1);
}

/**
 * Moves a connector and updates the view to display.
 * @param {*} connectorId The ID of the connector to move
 * @param {*} newX The x-coordinate to move to. If -1, will just redraw connection
 * @param {*} newY The y-coordinate to move to. If -1, will just redraw connection
 */
function moveConnector(connectorId, newX = -1, newY = -1) {
    let elementId = getConnectorName(connectorId)

    //check if element exists
    if(!elementExists(elementId)) {
        printDebug("Cannot move connector " + connectorId + " because the html element does not exist");
        return;
    }

    //can assume element exists now
    let element = document.getElementById(elementId);

    if(newX > -1 && newY > -1) {
        element.style.top = (newY - 7) + "px";
        element.style.left = (newX - 7) + "px";
    }

    //redraw connections from id
    let connectionsFromId = findConnectionsFrom(connectorId);
    for(let i = 0; i < connectionsFromId.length; i++) {
        drawConnection(connectionsFromId[i]);
    }

    //redraw connection to id
    if(connectionToIdExists(connectorId)) {
        drawConnection(findConnectionTo(connectorId));
    }
}

function moveNode(nodeId, newX, newY) {
    let elementId = getNodeName(nodeId);

    //check if node exists
    if(!elementExists(elementId)) {
        printDebug("Cannot move node " + elementId + " because the html element does not exist");
        return;
    }

    //can assume element exists now
    let element = document.getElementById(elementId);
    element.style.position = "absolute";
    element.style.top = (newY - nodeDragOffset.y) + "px";
    element.style.left = (newX - nodeDragOffset.x) + "px";

    //find and move connectors
    connectors = element.getElementsByClassName("dot");
    for(let i = 0; i < connectors.length; i++) {
        if(connectors[i].id.includes("connector_")) {
            moveConnector(connectorIdStringToInt(connectors[i].id));
        }
    }
}

function deselectAllNodes() {
    let selectedInnerBodies = document.querySelectorAll(".selected");
    for(let i = 0; i < selectedInnerBodies.length; i++) {
        selectedInnerBodies[i].classList.remove("selected");
    }
}

/**
 * Callback for a bottom connector mouse-down event.
 * @param {*} connectorId The id of the affected connector
 * @param {*} mouseX The x-coordinate of the cursor during the event
 * @param {*} mouseY The y-coordinate of the cursor during the event
 */
function bottomConnectorMouseDownCb(connectorId, mouseX, mouseY) {
    printDebug("Bottom connector mouse down");
    let newConnectorId = addNewDraggableConnector(mouseX, mouseY);

    //set the application to follow the connector on mouse move
    followingConnector = newConnectorId;
    
    //create a connection to track the parent
    connections.push(createNewConnection(connectorId, newConnectorId));
}

function topConnectorMouseDownCb(connectorId, mouseX, mouseY) {
    printDebug("Top connector mouse down");
    
    //find if there is anything connected. If so, user wants disconnect
    if(connectionToIdExists(connectorId)) {
        printDebug("Disconnecting connector " + connectorId);

        //delete already existing connection
        connectionToErase = findConnectionTo(connectorId);
        fromConnector = connectionToErase.from;
        eraseConnection(connectionToErase);

        //create draggable connection that follows the mouse
        let newConnectorId = addNewDraggableConnector(mouseX, mouseY);
        followingConnector = newConnectorId;
        newConnection = createNewConnection(fromConnector, followingConnector);
        drawConnection(newConnection);
        connections.push(newConnection);
    }
}

function nodeMouseDownCb(nodeId, mouseX, mouseY) {
    printDebug("Node mouse down for id " + nodeId);

    deselectAllNodes();

    //ignore if following a connector. This prevents issues when disconnecting a connector
    //which inadvertently triggers a node mousedown
    if(followingConnector > -1) {
        printDebug("Ignoring event because a connector is following the mouse");
        return;
    }

    //find drag offset of node element
    nodeElementId = getNodeName(nodeId);
    if(!elementExists(nodeElementId)) {
        printDebug("Cannot mouse-down element " + nodeElementId + " because it does not exist.");
        return;
    }

    let nodeElement = document.getElementById(nodeElementId);
    nodeDragOffset.y = mouseY - pxStrToInt(nodeElement.style.top);
    nodeDragOffset.x = mouseX - pxStrToInt(nodeElement.style.left);

    followingNode = nodeId;
}

function nodeMouseUpCb(nodeId, mouseX, mouseY) {
    printDebug("Node mouse up. Releasing and selecting node");

    followingConnector = -1;
    followingNode = -1;

    nodeName = getNodeName(nodeId);
    if(!elementExists(nodeName)) {
        printDebug("Ignoring event because no element exists.");
        return;
    }

    //find inner body of node and add selected property to it
    nodeElement = document.getElementById(nodeName);
    nodeBody = nodeElement.querySelector(".inner_body");
    if(nodeBody == null) {
        printDebug("Ignoring event because the node has no inner body.");
        return;
    }
    
    nodeBody.classList.add("selected");
}

/**
 * TODO
 * @param {*} connectorId 
 */
function draggableConnectorMouseUpCb(connectorId, mouseX, mouseY) {
    printDebug("Connector mouse up");

    let connectorElementId = getConnectorName(connectorId);
    if(!elementExists(connectorElementId)) {
        printDebug("Cannot mouse-up element " + connectorElementId + " because it does not exist.");
        return;
    }

    //remove connection from the following connector before removing the
    //connector itself.
    if(connectionToIdExists(connectorId)) {
        connectionToErase = findConnectionTo(connectorId);
        connectorFrom = connectionToErase.from;

        //check if we actually connected with anything
        elements = document.elementsFromPoint(mouseX, mouseY);
        for(let i = 0; i < elements.length; i++)
        {
            elem = elements[i];
            classes = elem.classList;
            isTop = classes.contains("top_connection") && classes.contains("dot");
            
            printDebug("Attempting to connect to " + elem.id);
            
            //is it a top connector
            if(!isTop) {
                //not printing anything here because there are so many cases that this message will not be useful
                continue;
            }

            connectorTo = connectorIdStringToInt(elem.id);
            
            //is the destination connector empty
            if(connectionToIdExists(connectorTo)) {
                printDebug("Failed to create connection because something is already connected to the top connector");
                continue;
            }

            //does the destination connector belong to a different node
            fromParent = findConnectorsParentNode(connectorFrom);
            toParent = findConnectorsParentNode(connectorTo);
            if(fromParent == toParent && fromParent != null) {
                printDebug("Failed to create connection because parent nodes are the same");
                continue;
            }
            
            //checks passed, create connection
            newConnection = createNewConnection(connectorFrom, connectorTo);
            connections.push(newConnection);
            drawConnection(newConnection);
            printDebug("Connection succeeded!");
            break;
        }

        //now erase following connection
        eraseConnection(connectionToErase);
    }

    let draggableElement = document.getElementById(connectorElementId);
    draggableElement.remove();
    followingNode = -1;
    followingConnector = -1;
} 

/**
 * Callback for a window mouse-move event.
 * @param {*} mouseX The new x-coordinate of the cursor
 * @param {*} mouseY The new y-coordinate of the cursor
 */
function mouseMoveCb(mouseX, mouseY) {
    if(followingConnector > -1) {
        //if a connector is following us, move it
        moveConnector(followingConnector, mouseX, mouseY, true);
    } else if(followingNode > -1) {
        //if a node if following us, move it
        moveNode(followingNode, mouseX, mouseY);
    }
}

function documentOnclickCb() {
    printDebug("De-selecting nodes");
    deselectAllNodes();
}

//main function
(function() {
    //find nodes and register them
    let nodes = document.querySelectorAll(".tree_node");
    numNodes = nodes.length;
    printDebug("Discovered " + numNodes + " nodes. Attaching events and setting IDs");

    for(let i = 0; i < numNodes; i++)
    {
        let nodeElement = nodes[i];
        let nodeId = getNextNodeId();

        nodeElement.id = getNodeName(nodeId);

        //mousedown listener
        nodeElement.addEventListener("mousedown", e => {
            nodeMouseDownCb(nodeId, e.clientX, e.clientY);
        });

        nodeElement.addEventListener("mouseup", e => {
            nodeMouseUpCb(nodeId, e.clientX, e.clientY);
        });
    }

    //find bottom connectors and register them
    let bottomConnectors = document.querySelectorAll(".bottom_connection");
    numBottomConnectors = bottomConnectors.length;
    printDebug("Discovered " + numBottomConnectors + " bottom connectors. Attaching events and setting IDs");

    for(let i = 0; i < numBottomConnectors; i++) {
        let connectorElement = bottomConnectors[i];
        connectorElement.draggable = false;

        let connectorId = getNextConnectorId();

        connectorElement.id = getConnectorName(connectorId);

        //mousedown listener
        connectorElement.addEventListener("mousedown", e => {
            bottomConnectorMouseDownCb(connectorId, e.clientX, e.clientY);
        });
    }

    //find top connectors and register them
    let topConnectors = document.querySelectorAll(".top_connection");
    numTopConnectors = topConnectors.length;
    printDebug("Discovered " + numTopConnectors + " top connectors. Attaching events and setting IDs");

    for(let i = 0; i < numTopConnectors; i++) {
        let connectorElement = topConnectors[i];
        connectorElement.draggable = false;

        let connectorId = getNextConnectorId();

        connectorElement.id = getConnectorName(connectorId);

        //mousedown listener
        connectorElement.addEventListener("mousedown", e => {
            topConnectorMouseDownCb(connectorId, e.clientX, e.clientY);
        });
    }

    printDebug("Adding event listeners to tree view");
    let treeview = document.querySelector(".tree_view");
    if(treeview != null) {
        window.addEventListener("mousedown", e => {
            documentOnclickCb();
        });
    } else {
        printDebug("ERROR: TREE VIEW DOES NOT EXIST");
        //will continue instead of return to ensure as much functionality as possible (even through its probably mute)
    }

    printDebug("Adding event listeners to window");
    window.addEventListener("mousemove", e => {
        mouseMoveCb(e.clientX, e.clientY);
    });
}())
