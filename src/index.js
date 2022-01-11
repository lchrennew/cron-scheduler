import './utils/env.js'
import Scheduler from "./scheduler.js";
import { startNotificationListener } from "./start-notification-listener.js";
import { startJobs } from "./start-jobs.js";

const scheduler = new Scheduler()
await startNotificationListener(scheduler)
await startJobs(scheduler)
