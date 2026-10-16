import path from 'node:path';
// Own configuration: do not inherit production redirects, headers or build labels.
export default {poweredByHeader:false,trailingSlash:false,turbopack:{root:path.resolve(import.meta.dirname,'../..')}};
