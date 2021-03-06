"use strict";
import {ConfDTO} from "../lib/dto/ConfDTO"
import * as stream from "stream"
import {Multicaster} from "../lib/streams/multicaster"
import {RouterStream} from "../lib/streams/router"

const constants = require('../lib/constants');

module.exports = {
  duniter: {
    service: {
      output: (server:any, conf:ConfDTO, logger:any) => new Router(server)
    },
    methods: {
      routeToNetwork: (server:any) => {
        const theRouter = new Router(server);
        theRouter.startService();
        server.pipe(theRouter);
      }
    }
  }
}

/**
 * Service which triggers the server's peering generation (actualization of the Peer document).
 * @constructor
 */
class Router extends stream.Transform {

  theRouter:any
  theMulticaster:Multicaster = new Multicaster()

  constructor(private server:any) {
    super({ objectMode: true })
  }

  _write(obj:any, enc:string, done:any) {
    // Never close the stream
    if (obj) {
      this.push(obj);
    }
    done && done();
  };

  async startService() {
    if (!this.theRouter) {
      this.theRouter = new RouterStream(this.server.PeeringService, this.server.dal)
    }
    this.theRouter.setActive(true);
    this.theRouter.setConfDAL(this.server.dal);

    /**
     * Enable routing features:
     *   - The server will try to send documents to the network
     *   - The server will eventually be notified of network failures
     */
    // The router asks for multicasting of documents
    this
      .pipe(this.theRouter)
    // The documents get sent to peers
      .pipe(this.theMulticaster)
      // The multicaster may answer 'unreachable peer'
      .pipe(this.theRouter);
  }

  async stopService() {
    this.unpipe();
    this.theRouter && this.theRouter.unpipe();
    this.theMulticaster && this.theMulticaster.unpipe();
  }
}
