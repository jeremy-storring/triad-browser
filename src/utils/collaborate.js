import GT from './GT';

// Code block to create text fields for username and room name
// ------------------------------------------------------------
const SERVER_NAME = "http://localhost:3000/"
const COMMON_ROOM_NAME = "triad_browser";

var btn = document.getElementById('btn');
var participantTable = document.getElementById('participantTable');

let userNameMap = new Map();
let userIDMap = new Map();
let userNameRowMap = new Map();
let userNameTeleMap = new Map();
var myUserRecord = undefined;

window.onload = async (event) => {

    window.gt = new GT(SERVER_NAME);

    // Wait for 2 seconds, so that the react part of code renders - quick hack TODO 
    setTimeout(() => {
        let GTWrapper = document.createElement("div");
        GTWrapper.innerHTML = '<input id="usask-collab-text" placeholder="Username" type="text"><button id="usask-collab-button">Connect</button><table id="participantTable"></table>';
        GTWrapper.style = 'position: absolute;top: 60px;left: 10px;z-index: 500;background: #000000;padding: 10px;text-align: center;padding-top: 15px;';
        document.body.prepend(GTWrapper);
        document.getElementById("usask-collab-button").addEventListener("click", () => connectUser());

        btn = document.getElementById("usask-collab-button");
        participantTable = document.getElementById('participantTable');

    }, 2000);

    // Nothing much to do in this block, this is called when the user connects to the server
    // The "on-connected"" block is where we instantiate the user
    gt.on('connect', id => { console.log(`UI is now connected to the server, (${id}).`) });

    gt.on('init_state', (state, users) => {
        console.log('Got whole new state:', state, users)

        // this could be us reconnecting, so check whether we 
        // know about other users before creating them
        for (const id in users) {
            if (userNameMap.has(users[id].name)) {
                // update instead of creating
                updateUser(users[id], id);
            } else {
                createUser(users[id], id);
            }
        }
    });

    // If the connection fails ,we can try to reconnect again or just disable the connect
    gt.on('connect_error', error => {
        document.getElementById("usask-collab-button").disabled = "true";
        alert("Connection failed to collaboration server");
    });

    gt.on('connected', (id, user_payload) => {
        // Disable the connect button since connection is successfull
        document.getElementById("usask-collab-button").disabled = "true";
        createUser(user_payload, id);
        startSendingTelepointer();
    });

    gt.on('disconnected', (id, reason) => {
        disconnectInParticipantList(id);
    });

    gt.on('user_updated_unreliable', (id, payload_delta) => {
        //console.log('Got a userupdateunreliable:', id, payload_delta);
        // special case for telepointers
        if (payload_delta.x && payload_delta.y) {
            if (id != gt.id) {
                updateTelepointer(payload_delta.x, payload_delta.y, id);
            }
        } else {
            // update anything else that may have been sent
            updateUser(payload_delta, id);
        }
    });

    gt.on('user_updated_reliable', (id, payload_delta) => {
        console.log('Got a userupdatereliable:', id, payload_delta);
        updateUser(payload_delta, id);
    });

    gt.on('state_updated_reliable', (id, payload_delta) => {
        console.log('Got a stateupdatereliable:', id, payload_delta)
    });

    gt.on('state_updated_unreliable', (id, payload_delta) => {
        console.log('Got a stateupdateunreliable:', id, payload_delta);
        if (payload_delta.start && payload_delta.width) {
            var target = document.getElementById('view-finder-window');
            target.setAttribute('data-x', payload_delta.start);
            target.style.webkitTransform = target.style.transform = 'translate(' + payload_delta.start + 'px,' + '0px)';
            target.style.width = payload_delta.width + 'px';
        }
    });

    gt.on('pingpong', (latencyValue) => {
        gt.updateUserReliable({ latency: latencyValue });
    });


}

function changeUserColor(e) {
    //var user = userIDMap.get(gt.id);
    //console.log("Updating user color");
    gt.updateUserReliable({
        color: e.target.value
    });
}

function connectUser() {
    let name = document.getElementById("usask-collab-text").value;
    // connect with default user info
    gt.connect(COMMON_ROOM_NAME, {
        x: 0,
        y: 0,
        name,
        color: '#eeeeee',
        latency: "?"
    });
}

// *****************************************************************************
// Functions for user records
// *****************************************************************************

function createUser(user, id) {
    // check whether user exists (i.e., a reconnect)
    if (userNameMap.has(user.name)) {
        // remap new id to user
        userIDMap.set(id, user);
        connectInParticipantList(id);
        // TODO: remove old id (look through users by name)
        // update user info in case anything's changed
        updateUser(user, id);
    } else {
        // create new user object
        userNameMap.set(user.name, user);
        userIDMap.set(id, user);
        createUserRepresentation(user, id);
    }
    // store my record for later reconnections
    if (id == gt.id) {
        myUserRecord = userIDMap.get(id);
    }
}

function updateUser(delta, id) {
    const user = userIDMap.get(id);
    // update the map first
    for (let key in delta) {
        user[key] = delta[key];
    }
    // update the visual representations
    updateUserRepresentation(user, delta, id);
}


// *****************************************************************************
// User representation (participant list and telepointer)
// *****************************************************************************

function createUserRepresentation(user, id) {
    // participant list
    createInParticipantList(user, id);
    // telepointer (for others)
    if (id != gt.id) {
        addTelepointer(user, id);
    }
}

function updateUserRepresentation(user, delta, id) {
    // get user's row in participant list
    const row = userNameRowMap.get(user.name);
    for (let key in delta) {
        //console.log(key, user[key], delta[key]);
        if (key == "color") {
            // split based on whether it's us or not
            if (id == gt.id) {
                row.cells[1].children[0].value = delta.color;
            } else {
                row.cells[1].children[0].style.backgroundColor = delta.color;
                // update telepointer for others
                let tele = userNameTeleMap.get(user.name);
                tele.children[0].setAttribute("fill", delta.color);
            }
        }
        if (key == "latency") {
            row.cells[2].innerHTML = delta.latency + "ms";
        }
    }
}


// *****************************************************************************
// Participant list 
// *****************************************************************************

function createInParticipantList(user, id) {
    var row, colorWidget;
    // if user is already in the participant list, update rather than create
    if (userNameRowMap.has(user.name)) {
        updateUserRepresentation(user, id);
        // update connected status (not part of user record)
        row = userNameRowMap.get(user.name);
        row.cells[3].children.innerHTML = 'Connected';
    } else {
        // create a new row for the user
        row = participantTable.insertRow(-1);
        // add to map
        userNameRowMap.set(user.name, row);
        // set up attributes
        //row.setAttribute("id", "user-" + id);
        const nameCell = row.insertCell(0);
        const colorCell = row.insertCell(1);
        // if this is us, make the colour selectable
        if (id == gt.id) {
            colorWidget = document.createElement('input');
            colorWidget.setAttribute("type", "color");
            colorWidget.setAttribute("value", user.color);
            colorWidget.setAttribute("class", "colorPicker");
            colorWidget.addEventListener('input', changeUserColor);
        } else {
            colorWidget = document.createElement('div');
            colorWidget.setAttribute("class", "colorBox");
            colorWidget.style.backgroundColor = user.color;
        }
        colorCell.appendChild(colorWidget);
        const latencyCell = row.insertCell(2);
        const connectedCell = row.insertCell(3);
        // add content based on user information
        nameCell.innerHTML = user.name;
        latencyCell.innerHTML = user.latency;
        connectedCell.innerHTML = 'Connected';
    }
}

function disconnectInParticipantList(id) {
    const user = userIDMap.get(id);
    const row = userNameRowMap.get(user.name);
    if (row != undefined) {
        row.cells[3].children.innerHTML = 'Disconnected';
    }
    // If it's us, change "Connect" button title 
    if (id == gt.id) {
        btn.innerHTML = "Connect";
    }
}

function connectInParticipantList(id) {
    const user = userIDMap.get(id);
    const row = userNameRowMap.get(user.name);
    if (row != undefined) {
        row.cells[3].children.innerHTML = 'Connected';
    }
    // If it's us, change "Connect" button title 
    if (id == gt.id) {
        btn.innerHTML = "Disconnect";
    }
}

// TODO: decide when to remove a user from the participant list

// *****************************************************************************
// Telepointer
// *****************************************************************************

function addTelepointer(user, id) {
    console.log("adding telepointer", user, user.name);
    var tele = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tele.setAttribute("height", "28px");
    tele.setAttribute("width", "21px");
    tele.style.position = "absolute";
    tele.style.zIndex = 1000;

    var pointer = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    pointer.setAttribute("fill", user.color);
    pointer.setAttribute("stroke", "#000000");
    pointer.setAttribute("stroke-width", "1");
    pointer.setAttribute("points", "0,0 0,25 8,20 13,28 16,27 11,19 21,19 0,0");
    tele.appendChild(pointer);
    document.body.appendChild(tele);
    userNameTeleMap.set(user.name, tele);
    console.log("Done adding telepointer", user, user.name);
}

function updateTelepointer(teleX, teleY, id) {
    var user = userIDMap.get(id);
    var tele = userNameTeleMap.get(user.name);
    //tele.style.transform = "translate(" + teleX + "px," + teleY + "px)";
    tele.style.top = teleY + "px";
    tele.style.left = teleX + "px";
}

function startSendingTelepointer() {
    window.addEventListener('mousemove', e => {
        // FIX LATER: handle scrolling pages
        //let offX = document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft;
        //let offY = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop;
        gt.updateUserUnreliable({
            x: e.clientX,
            y: e.clientY
        });
    });
}
