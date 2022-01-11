// https://tools.ietf.org/html/rfc8441

import chalk from 'chalk';
import EventEmitter from 'eventemitter2';
import SockJS from 'sockjs-client';
import { getApi, json, POST } from '../fetch.js';
import { defaultLogProvider } from '../logger.js';
import { Channel, WebSocketMultiplex } from './multiplex.js';

const logger = defaultLogProvider('Broker Client')

class Client extends EventEmitter.EventEmitter2 {
    server;
    /**
     * @type {{[string]: Channel}}
     */
    channels;
    /**
     *
     * @type {SockJS}
     */
    sock
    /**
     *
     * @type {WebSocketMultiplex}
     */
    multiplexer;
    retries = 0;
    opened = false;
    #fallbacks = {}

    constructor(server) {
        super();
        this.server = server;
    }

    connect(onOpen) {
        if (this.opened) return;
        /**
         *
         * @type {SockJS}
         */
        const sock = new SockJS(`${this.server}/queues`);
        this.sock = sock;
        this.multiplexer = new WebSocketMultiplex(this.sock);
        this.channels = {};
        sock.onclose = (e) => {
            logger.info(chalk.yellow(`Connection closed: ${e.reason} (${e.code}).`));
            this.opened = false;
            delete this.sock;
            delete this.multiplexer;
            if (e.code !== 1000) {
                logger.info(chalk.white('Reconnecting.'));
                setTimeout(() => this.connect(onOpen), 3000)
            }
        };

        return new Promise(resolve =>
            sock.onopen = () => {
                logger.info(chalk.white('Connection opened.'));
                this.opened = true;
                this.retries = 0;
                onOpen?.()
                this.emit('connected')
                resolve(this)
            })
    }

    disconnect() {
        this.sock?.close();
        this.channels = {};
    }

    createFallback(topic, receive) {
        this.removeFallback(topic)
        this.once('connected', this.#fallbacks[topic] = () => this.subscribe(topic, receive))
    }

    subscribe(topic, receive) {
        logger.info(chalk.white('Subscribe'), topic)
        this.createFallback(topic, receive)
        if (!this.opened) return;
        /**
         * @type {Channel}
         */
        let channel = this.channels[topic];
        if (!channel) {
            channel = this.multiplexer.channel(topic);
            channel.onopen = () => logger.info(chalk.white(`Channel ${topic} opened.`));
            channel.onmessage = receive;
            channel.onclose = () => logger.info(chalk.white(`Channel ${topic} closed.`));
            this.channels[topic] = channel;
        }
        return channel;
    }

    async subscribeAsync(topic, receive) {
        return new Promise(resolve => {
            logger.info(chalk.white('Subscribe'), topic)
            this.createFallback(topic, receive)
            if (!this.opened) return resolve();
            /**
             * @type {Channel}
             */
            let channel = this.channels[topic];
            if (!channel) {
                channel = this.multiplexer.channel(topic);
                channel.onopen = () => {
                    logger.info(chalk.white(`Channel ${topic} opened.`));
                    resolve(channel)
                }
                channel.onmessage = receive;
                channel.onclose = () => logger.info(chalk.white(`Channel ${topic} closed.`));
                this.channels[topic] = channel;
            } else
                resolve(channel)
        })
    }

    removeFallback(topic) {
        const exists = this.#fallbacks[topic]
        exists && this.off('connected', exists)
        delete this.#fallbacks[topic]
    }

    unsubscribe(topic) {
        logger.info(chalk.white('Unsubscribe'), topic)
        if (!this.opened) return;
        this.removeFallback(topic)

        /**
         * @type {Channel}
         */
        let channel = this.channels[topic];
        if (channel) {
            channel.close();
            delete this.channels[topic];
        }
    }

    send(topic, message) {
        if (!this.opened) return;
        /**
         * @type {Channel}
         */
        let channel = this.channels[topic];
        if (!channel)
            logger.warn('You should subscribe this topic first');
        else
            channel.send(message)
    }

    /**
     * 通过HTTP接口发不到主题
     * @param topic
     * @param message
     * @return {Promise<void>}
     */
    async publish(topic, message) {
        const api = getApi(this.server)
        await api(`publish/${encodeURIComponent(topic)}`, POST, json(message)).catch(() => null)
    }
}

export default Client
