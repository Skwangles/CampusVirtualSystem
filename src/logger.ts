import winston from "winston";

const logger = winston.createLogger({
  transports: [
    // Just errors
    new winston.transports.File({ filename: 'error.log', level: 'error' }),

    // All logs
    new winston.transports.File({ filename: 'combined.log', level: "debug", })
  ]
})

logger.exceptions.handle(
  new winston.transports.File({ filename: 'exceptions.log' })
)

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()), level: "debug" }),
  )
}

export default logger