// Mock implementation of node-fetch for testing
const fetch = async (url, options = {}) => {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map(),
    url: url,
    json: async () => ({}),
    text: async () => '',
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
  };
};

export default fetch;
export { fetch };
