import chalk from "chalk";
import Client from "./utils/broker/client.js";
import { defaultLogProvider } from "./utils/logger.js";

const logger = defaultLogProvider('Cron Scheduler')

export const startNotificationListener = async scheduler => {
    logger.info(chalk.white('Starting notification listener'))
    const notificationListener = new Client(process.env.SOCKJS_URL)
    await notificationListener.connect()
    await notificationListener.subscribeAsync('to_scheduler', ({ data }) => {
        const { msg: { event, job } } = JSON.parse(data)
        scheduler.emit(event, job)
        logger.info(`📧 Notification: ${event} job ${job.key}`)
    })
    logger.info(chalk.bgGreenBright('👀 Waiting for notifications'))
}
