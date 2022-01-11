import { getApi, json, POST } from "../utils/fetch.js";
import { defaultLogProvider } from "../utils/logger.js";

const logger = defaultLogProvider('job-service.js')

const api = getApi(process.env.JOB_SERVER)

const getData = async (...args) => {
    const response = await api(...args)
    const { ok, data, message } = await response.json()
    if (!ok) logger.warn(message)
    return data
}

const invoke = async (...args) => await api(...args).catch(() => null)

export const getJobs = async () => await getData('jobs').catch(() => [])

export const obsoleteJob = async key => await invoke(`jobs/${key}/obsolete`, POST)

export const bidJob = async (key, target) => await getData(`jobs/${key}/bid`, POST, json({ target }))
