'use strict';
/** Zod-based request validation. Usage: validate({ body: schema, query, params }). */
const { HttpError } = require('../lib/util');

function validate(schemas) {
  return (req, res, next) => {
    try {
      for (const key of ['body', 'query', 'params']) {
        if (schemas[key]) {
          const parsed = schemas[key].parse(req[key] || {});
          // query/params are read-only getters on Express 5+, assign to a mirror
          if (key === 'body') req.body = parsed;
          else req.validated = { ...(req.validated || {}), [key]: parsed };
        }
      }
      next();
    } catch (err) {
      if (err.issues) {
        const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
        return next(new HttpError(422, 'Validation failed', details));
      }
      next(err);
    }
  };
}

module.exports = { validate };
