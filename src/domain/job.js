import Schedule from "./schedule.js";
import { scheduleJob } from 'node-schedule'
import dayjs from "dayjs";
import { bidJob } from "../service/job-service.js";
import { getLogger } from "es-get-logger";
import { generateObjectID } from "es-object-id";

const logger = getLogger('job.js')
export default class Job {
    name
    creator;
    worker;
    key;
    /**
     * @type {Schedule}
     */
    schedule;
    cron

    /**
     *
     * @param key {string}
     * @param name {string}
     * @param creator {string}
     * @param schedule {Schedule}
     * @param worker {WorkerSpec}
     */
    constructor({ key = generateObjectID(), name, creator, schedule, worker }) {
        this.key = key;
        this.schedule = new Schedule(schedule);
        this.worker = worker;
        this.name = name
        this.creator = creator
    }

    get actualStartTime() {
        return this.schedule.startTime.actualTime
    }

    get limited() {
        return this.hasLimit || this.hasSkip
    }

    get hasSkip() {
        return this.schedule.skip > 0;
    }

    get hasLimit() {
        return this.schedule.limit > 0;
    }

    /**
     * 是否已经打烊（营业时间：actualStartTime -> endTime）
     * @param now {dayjs.Dayjs}
     */
    closed(now) {
        return now.isBefore(this.actualStartTime) && now.isAfter(this.schedule.endTime)
    }

    /**
     * 秒杀目标，先到先得
     * @param now {dayjs.Dayjs}
     * @return {Promise<boolean>} 秒到返回truthy, 否则返回falsy
     */
    async bid(now) {
        const result = await bidJob(this.key, now.valueOf())
        logger.info(`Bid ${this}:`, result)
        if (result === 'Obsolete') this.cron.cancel()
    }

    start() {
        this.cron = scheduleJob(this.schedule.cron, this.tick.bind(this))
    }

    stop() {
        this.cron.cancel()
    }

    async tick(date) {
        const now = dayjs(date)
        if (this.notStarted(now)) return
        await this.bid(now).catch(error => {
            this.stop()
            logger.warn(now, `${this} stopped because an error occurs:`, error.message)
        })
    }

    notStarted(now) {
        return now.isBefore(this.actualStartTime)
    }

    hasEnded(now) {
        return this.schedule.endTime && now.isAfter(this.schedule.endTime)
    }

    toString() {
        return `Job "${this.name}" <${this.key}>`
    }
}
