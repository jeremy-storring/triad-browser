// https://stackoverflow.com/questions/45831911/is-there-any-eventemitter-in-browser-side-that-has-similar-logic-in-nodejs
class EventEmitter {
    constructor() {
        this.__callbacks = {}
    }

    on(event, cb) {
        if (!this.__callbacks[event]) this.__callbacks[event] = []
        this.__callbacks[event].push(cb)
    }

    once(event, cb) {
        const thiscb = (...args) => {
            cb(...args)
            this.off(event, thiscb)
        }

        this.on(event, thiscb)
    }

    emit(event, ...args) {
        if (!this.__callbacks[event]) return

        let cbs = [...this.__callbacks[event]]
        if (cbs) {
            cbs.forEach(cb => cb(...args))
        }
    }

    off(event, cb) {
        if (!this.__callbacks[event]) return

        if (!cb) {
            delete this.__callbacks[event]
        } else {
            this.__callbacks[event].splice(this.__callbacks[event].indexOf(cb), 1)
        }
    }
}

/**
 * Fired when the server sends us the entire state of the room.
 * Happens when we just join a room.
 *
 * @event GT#init_state
 * @param {Object} state The state of the room.
 * @param {Object} users All the users and their states. Key'd by user id, value being the state of the user.
 * @param {String} room the name of the room
 */

/**
* Fires when someone joins the room.
*
* @event GT#connected
* @param {String} id The id of the user who connected.
* @param {Object} user The inital state of the user.
*/

/**
* Fires when someone joins the room.
*
* @event GT#disconnected
* @param {String} id The id of the user who disconnected.
* @param {String} reason
*/

/**
 * Fires when we connect to the server
 *
 * @event GT#connect
 * @param {String} id The id we were issued.
 */

/**
* Fires when we disconnect from the server
*
* @event GT#disconnect
* @param {String} reason
*/

/**
 * Fires when we receive a connection error when trying to connect to the server.
 *
 * @event GT#connect_error
 * @param {Object} error
 */

/**
* Fires when we receive a delta of a user's state.
*
* @event GT#user_updated_reliable
* @param {String} id The id of the user who's state got updated.
* @param {Object} payload_delta The delta of the state.
*/

/**
* Fires when we receive a delta of a user's state.
*
* @event GT#user_updated_unreliable
* @param {String} id The id of the user who's state got updated.
* @param {Object} payload_delta The delta of the state.
*/

/**
* Fires when we receive a delta of the room's state
*
* @event GT#state_updated_reliable
* @param {String} id The id of the user who sent the update
* @param {Object} payload_delta The delta of the state.
*/

/**
* Fires when we receive a delta of the room's state
*
* @event GT#state_updated_unreliable
* @param {String} id The id of the user who sent the update
* @param {Object} payload_delta The delta of the state.
*/

/**
 * The GT object.
 *
 * @emits GT#init_state
 * @emits GT#connected
 * @emits GT#disconnected
 * @emits GT#user_updated_reliable
 * @emits GT#user_updated_unreliable
 * @emits GT#state_updated_reliable
 * @emits GT#state_updated_unreliable
 * @emits GT#connect
 * @emits GT#disconnect
 * @emits GT#connect_error
 * 
 * @property {Object} socket The interal socket we use as communation.
 * @property {String} id Our unique identifier, issued from the server, undefined when we are not connected to the server.
 */
class GT extends EventEmitter {
    socket = undefined
    id = undefined

    /**
     * Returns a new GT object.
     * @param {String} server_ip Optional ip to connect to
     */
    constructor(server_ip) {
        super()

        const socket = io("http://ec2-35-183-47-186.ca-central-1.compute.amazonaws.com:8080", {
            autoConnect: false,
            reconnection: false
        })

        this.socket = socket

        // setup the events.
        socket.on('init_state', (state, users, room) => {
            this.emit('init_state', state, users, room)
        })

        socket.on('connected', (id, user) => {
            this.emit('connected', id, user)
        })
        socket.on('disconnected', (id, reason) => {
            this.emit('disconnected', id, reason)
        })

        socket.on('user_updated_reliable', (id, payload_delta) => {
            this.emit('user_updated_reliable', id, payload_delta)
        })
        socket.on('user_updated_unreliable', (id, payload_delta) => {
            this.emit('user_updated_unreliable', id, payload_delta)
        })

        socket.on('state_updated_reliable', (id, payload_delta) => {
            this.emit('state_updated_reliable', id, payload_delta)
        })
        socket.on('state_updated_unreliable', (id, payload_delta) => {
            this.emit('state_updated_unreliable', id, payload_delta)
        })

        this.id = undefined

        socket.on('connect', () => {
            this.id = socket.id

            this.emit('connect', socket.id)
        })

        socket.on('disconnect', reason => {
            this.emit('disconnect', reason)

            this.id = undefined
        })

        socket.on('connect_error', error => {
            this.emit('connect_error', error)
        })

        socket.on('ping', () => {
            //console.log('GT: ping');
        })

        socket.on('pong', (latency) => {
            //console.log('GT: pong: ' + latency);
            this.emit('pingpong', latency);
        })
    }

    /**
     * @returns {Boolean} If we are connected to the server.
     */
    isConnected() {
        return this.id !== undefined
    }

    /**
     * Connects to the server and joins a room.
     * @param {String} room The roomname we want to join.
     * @param {Object} user_payload An optional inital state we have as a user.
     */
    connect(room, user_payload) {
        if (this.isConnected()) return

        this.socket.connect()

        this.socket.once('connect', () => {
            this.socket.emit('join_room', room, user_payload)
        })
    }

    /**
     * Disconnects from the server.
     */
    disconnect() {
        if (!this.isConnected()) return

        this.socket.disconnect()
    }

    /**
     * Sends to the server a delta of the room's state immediately.
     * @param {Object} payload_delta The delta object to send to the server.
     */
    updateStateReliable(payload_delta) {
        this.socket.emit('state_updated_reliable', payload_delta)
    }

    /**
     * Sends to the server a delta of the room's state. If we send too fast, the server will queue our messages and collapse.
     * @param {Object} payload_delta The delta object to send to the server.
     */
    updateStateUnreliable(payload_delta) {
        this.socket.emit('state_updated_unreliable', payload_delta)
    }

    /**
     * Sends to the server a delta of the our user's state immediately.
     * @param {Object} payload_delta The delta object to send to the server.
     */
    updateUserReliable(payload_delta) {
        this.socket.emit('user_updated_reliable', payload_delta)
    }

    /**
     * Sends to the server a delta of the our user's state. If we send too fast, the server will queue our messages and collapse.
     * @param {Object} payload_delta The delta object to send to the server.
     */
    updateUserUnreliable(payload_delta) {
        this.socket.emit('user_updated_unreliable', payload_delta)
    }
}
