import chalk from "chalk";
import Client from 'sockjs-broker-client'
import { generateObjectID } from "./utils/oid.js";
import { getLogger } from "es-get-logger";

const logger = getLogger('Cron Scheduler')

export const startNotificationListener = async scheduler => {
    logger.info(chalk.white('Starting notification listener'))
    const notificationListener = new Client({ server: process.env.SOCKJS_URL, logger, generateID: generateObjectID })
    await notificationListener.connect()
    await notificationListener.subscribeAsync('to_scheduler', ({ data }) => {
        const { msg: { event, job } } = JSON.parse(data)
        scheduler.emit(event, job)
        logger.info(`📧 Notification: ${event} job ${job.key}`)
    })
    logger.info(chalk.bgGreenBright('👀 Waiting for notifications'))
}
