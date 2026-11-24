const dns = require('dns');
const BLACKHOLED_IP = '76.76.21.21';
const WORKING_IP = '76.76.21.142';

function fixAddress(addr) {
  if (addr === BLACKHOLED_IP) return WORKING_IP;
  return addr;
}

const origLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const wrappedCallback = (err, address, family) => {
    if (err) return callback(err, address, family);
    if (Array.isArray(address)) {
      const fixed = address.map(item => {
        if (typeof item === 'object') {
          return { ...item, address: fixAddress(item.address) };
        }
        return fixAddress(item);
      });
      return callback(null, fixed, family);
    }
    return callback(null, fixAddress(address), family);
  };

  return origLookup.call(this, hostname, options, wrappedCallback);
};

const origPromisesLookup = dns.promises && dns.promises.lookup;
if (origPromisesLookup) {
  dns.promises.lookup = async function(hostname, options) {
    const res = await origPromisesLookup.apply(this, arguments);
    if (Array.isArray(res)) {
      return res.map(item => ({ ...item, address: fixAddress(item.address) }));
    }
    return { ...res, address: fixAddress(res.address) };
  };
}
