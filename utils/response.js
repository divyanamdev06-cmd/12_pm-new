export const sendResponse = (res, options) => {
    const {
        statusCode = 200,
        success = true,
        message = "",
        data = null,
        error = null
    } = options;

    return res.status(statusCode).json({
        success,
        message,
        data,
        error
    });
};
export const errorResponse = (res, message, statusCode = 500, error = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        error
    });
};