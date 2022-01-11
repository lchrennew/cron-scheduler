import Job from "./domain/job.js";
import { getJobs } from "./service/job-service.js";
import { defaultLogProvider } from "./utils/logger.js";
import EventEmitter from "eventemitter2";

const logger = defaultLogProvider('scheduler.js')
export default class Scheduler extends EventEmitter.EventEmitter2 {
    /**
     *
     * @type {Job[]}
     */
    jobs = []

    constructor() {
        super();
        this.on('added', job => this.appendJob(new Job(job)))
        this.on('updated', job => this.replaceJob(new Job(job)))
        this.on('deleted', job => this.removeJob(new Job(job)))
    }

    async loadJobs() {
        const data = await getJobs()
        this.jobs = [ ...data ].map(job => new Job({ ...job }))
    }

    async startJobs() {
        this.jobs.forEach(job => job.start())
    }

    appendJob(job) {
        this.jobs.push(job)
        job.start()
    }

    replaceJob(job) {
        this.removeJob(job)
        this.appendJob(job)
    }

    removeJob({ key }) {
        this.jobs = this.jobs.filter(job => {
            const matched = job.key === key
            matched && job.stop()
            return !matched
        })
    }
}
