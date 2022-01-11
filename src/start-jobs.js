import chalk from "chalk";
import { defaultLogProvider } from "./utils/logger.js";

const logger = defaultLogProvider('Cron Scheduler')

export const startJobs = async scheduler => {
    logger.info(chalk.white('Loading scheduler jobs'))
    await scheduler.loadJobs()
    logger.info(chalk.bgGreenBright(`🎁 Loaded ${scheduler.jobs.length} job${scheduler.jobs.length > 1 ? 's' : ''}`))

    logger.info(chalk.white('Starting schedules'))
    await scheduler.startJobs()
    logger.info(chalk.bgGreenBright('🎉 Started schedules'))
}
