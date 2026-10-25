// Blocks NoSQL operator injection: removes any object key that starts with "$"
// or contains "." from req.body, req.query and req.params (e.g. {"email":{"$gt":""}}).
function clean(value, depth = 0) {
  if (depth > 10 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete value[key];
    } else {
      value[key] = clean(value[key], depth + 1);
    }
  }
  return value;
}

function sanitize(req, _res, next) {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  if (req.query) {
    // Express 4 query object is mutable; clean in place.
    clean(req.query);
  }
  next();
}

module.exports = { sanitize, clean };
