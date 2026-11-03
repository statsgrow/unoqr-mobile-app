import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../package.json', import.meta.url));
const ts = require('typescript');

// Executes the real mobile auth modules with in-memory native storage and no Expo runtime.
function harness() {
  const memory = new Map();
  const modules = new Map();
  const requests = [];
  const billingRequests = [];
  const checkoutRequests = [];
  let reply;
  let installed = 0;
  const noop = () => {};
  class EmptyFile { exists = false; delete() {} }
  const mocks = {
    '@/utils/general/Axios': { Axios: {
      post: async (url, data) => { billingRequests.push({ url:new URL(url),data }); return { data:{ data:{ uid:'odr_test',status:'pending',currency:'INR',subtotal_amount:24900,discount_amount:0,tax_amount:0,total_amount:24900 } } }; },
      put: async (url, data) => { billingRequests.push({ url:new URL(url),data }); return { data:{ data:{ billing_address:data } } }; },
      get: async url => { billingRequests.push({ url:new URL(url) }); return { data:{ data:new URL(url).pathname === '/app/subscriptions/orders' ? { order:{ uid:'odr_test',status:'pending',total_amount:24900 },checkout:null,payment:null } : { currency:'INR',plans:[] } } }; },
    } },
    'react-native': { Platform:{ OS:'ios' },TurboModuleRegistry:{ get:() => ({}) } },
    'react-native-razorpay': { open:async options => {
      checkoutRequests.push(options);
      return { razorpay_payment_id:'pay_test',razorpay_subscription_id:options.subscription_id,razorpay_signature:'signed' };
    } },
    '@/utils/general/Storage': { getData: async ({ key }) => memory.get(key) ?? null, setData: async ({ key,value }) => { memory.set(key,value); }, removeData: async ({ key }) => { memory.delete(key); } },
    'expo-file-system': { Directory:EmptyFile,File:EmptyFile,Paths:{ cache:'/cache',document:'/documents' } },
    '@/utils/auth/AppInstall': { insertAppInstall:async () => { installed++; return { id:'test-install' }; },disconnectUserAppInstall:noop },
    '@/helpers/digital_cards/files/qrCardFiles': { pauseQrCardImageRequests:noop,resumeQrCardImageRequests:noop },
    '@/helpers/digital_cards/db/init': { initDigitalCardsTable:noop },
    '@/helpers/qrcodes/db/initQrCodes': { initQrCodes:noop },
    '@/helpers/scans/db/init': { initScansTable:noop },
    '@/utils/sqlite/db': { sqliteDB:null },
    '@/helpers/scans/scanSync': { pauseScanSync:noop,resumeScanSync:noop },
    '@/helpers/qrcodes/QrSync': { pauseQrCodeSync:noop,resumeQrCodeSync:noop },
    '@/helpers/digital_cards/api/cards': { pauseDigitalCardRequests:noop,resumeDigitalCardRequests:noop },
    '@/helpers/digital_cards/utils/SyncDigitalCards': { pauseDigitalCardSync:noop,resumeDigitalCardSync:noop },
  };
  const fetch = async (url,options) => {
    requests.push({ url:new URL(url),options });
    assert.equal(new URL(url).pathname,'/app/auth/user');
    if (!reply) throw new Error('Unexpected auth request');
    return reply(url,options);
  };
  const load = (name,from = path.join(root,'src')) => {
    if (mocks[name]) return mocks[name];
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name);
    const base = (name.startsWith('@/') ? path.join(root,'src',name.slice(2)) : path.resolve(from,name)).replace(/\.ts$/,'');
    const filename = existsSync(base + '.ts') ? base + '.ts' : base + '.tsx';
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports:{} };
    modules.set(filename,module);
    const code = ts.transpileModule(readFileSync(filename,'utf8'), { compilerOptions:{ module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true } }).outputText;
    const factory = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
      process:{ env:{ EXPO_PUBLIC_API_ENV:'production',EXPO_PUBLIC_API_URL_PRODUCTION:'https://api.example.test' } },
      URL,AbortController,Response,Headers,Error,TypeError,Promise,Set,Map,Date,
      setTimeout,clearTimeout,setInterval,clearInterval,fetch,console:{ ...console,warn:noop },
    }, { filename });
    factory(dependency => load(dependency,path.dirname(filename)),module,module.exports);
    return module.exports;
  };
  const settings = load('@/settings');
  return { memory,requests,billingRequests,checkoutRequests,load,settings,setReply:value => { reply = value; },installed:() => installed };
}

// Creates a local JWT for testing the client's expiry check; server verification is tested in the API.
function token(expired = false) {
  return `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub:'user-id',exp:Math.floor(Date.now()/1000) + (expired ? -60 : 3600) })).toString('base64url')}.signature`;
}

// Supplies the complete server user, including enriched plan definitions and allowances.
function account(code = 'app_pro_plan') {
  const included = code === 'app_pro_plan' ? 5 : 2;
  return { id:'user-id',email:'app@example.test',first_name:'App',last_name:'User',role:'user',
    subscription:{ id:'sub-id',code,plan:{ code,included_cards:included,inclusions:['Digital business cards'],exclusions:[] },addons:[],limits:{ included,additional:0,total:included,used:1,available:included - 1,over_limit:0,can_create:true } } };
}

test('refresh uses the app endpoint once across concurrent callers and updates storage and subscribed views', async () => {
  const h = harness(); const tokens = h.load('@/utils/auth/AuthTokens');
  const { storageTokens:keys } = h.settings.userTokenSettings;
  h.memory.set(keys.accessToken.name,token(true)); h.memory.set(keys.refreshToken.name,'old-refresh');
  const updated = account(); let notified;
  h.load('@/utils/auth/AuthUserStorage').subscribeAuthUser(user => { notified = user; });
  h.setReply(async () => Response.json({ data:updated },{ headers:{ 'x-new-auth-token':token(),'x-new-auth-refresh-token':'new-refresh' } }));
  const results = await Promise.all([tokens.refreshTokensSilently(),tokens.refreshTokensSilently(),tokens.refreshTokensSilently()]);
  assert.equal(results.join(','),'refreshed,refreshed,refreshed');
  assert.equal(h.requests.length,1);
  assert.equal(h.memory.get(keys.refreshToken.name),'new-refresh');
  assert.equal(h.memory.get(keys.userData.name).subscription.plan.code,'app_pro_plan');
  assert.equal(notified.subscription.plan.code,'app_pro_plan');
});

test('missing access tokens refresh and cached subscription data remains available to getStorageUser', async () => {
  const h = harness(); const { storageTokens:keys } = h.settings.userTokenSettings;
  h.memory.set(keys.refreshToken.name,'old-refresh');
  h.setReply(async () => Response.json({ data:account() },{ headers:{ 'x-new-auth-token':token(),'x-new-auth-refresh-token':'new-refresh' } }));
  const user = await h.load('@/utils/auth/AuthUser').getStorageUser();
  assert.equal(user.subscription.plan.code,'app_pro_plan');
  assert.equal(h.requests.length,1);
  assert.equal(h.requests[0].options.headers['x-auth-token'],undefined);
});

test('fresh login loads the enriched API user instead of trusting the login-provider profile', async () => {
  const h = harness(); h.setReply(async () => Response.json({ data:account() }));
  const user = await h.load('@/utils/auth/AuthUser').addUserData({ accessToken:token(),refreshToken:'new-refresh',userData:{ id:'legacy-login-user' } });
  assert.equal(user.id,'user-id'); assert.equal(user.subscription.plan.code,'app_pro_plan');
  assert.equal(h.requests.length,1); assert.equal(h.installed(),1);
  for (const key of Object.values(h.settings.postLoginSyncSettings)) assert.equal(h.memory.get(key),'pending');
});

test('account cleanup removes initial download markers along with the user session', async () => {
  const h = harness();
  for (const key of Object.values(h.settings.postLoginSyncSettings)) h.memory.set(key,'completed');
  await h.load('@/utils/auth/AuthUser').processUserLogout({ installationConfirmed:true });
  for (const key of Object.values(h.settings.postLoginSyncSettings)) assert.equal(h.memory.has(key),false);
});

test('legacy cached users without a subscription are replaced through app auth', async () => {
  const h = harness(); const { storageTokens:keys } = h.settings.userTokenSettings;
  h.memory.set(keys.accessToken.name,token()); h.memory.set(keys.refreshToken.name,'refresh'); h.memory.set(keys.userData.name,{ id:'user-id' });
  h.setReply(async () => Response.json({ data:account('app_basic_plan') }));
  const user = await h.load('@/utils/auth/AuthUser').getStorageUser();
  assert.equal(user.subscription.plan.code,'app_basic_plan'); assert.equal(h.requests.length,1);
});

test('invalid refresh clears tokens and cached user while temporary RPC failures retain rotated tokens', async () => {
  for (const status of [401,500]) {
    const h = harness(); const { storageTokens:keys } = h.settings.userTokenSettings;
    h.memory.set(keys.accessToken.name,token(true)); h.memory.set(keys.refreshToken.name,'old-refresh'); h.memory.set(keys.userData.name,account());
    const fresh = token();
    h.setReply(async () => Response.json({ message:'Auth/profile unavailable' },{ status,headers:{ 'x-new-auth-token':fresh,'x-new-auth-refresh-token':'rotated-refresh' } }));
    assert.equal(await h.load('@/utils/auth/AuthTokens').refreshTokensSilently(),'failed');
    if (status === 401) {
      assert.equal(h.memory.has(keys.accessToken.name),false); assert.equal(h.memory.has(keys.userData.name),false);
    } else {
      assert.equal(h.memory.get(keys.accessToken.name),fresh); assert.equal(h.memory.get(keys.refreshToken.name),'rotated-refresh');
      assert.equal(h.memory.get(keys.userData.name).subscription.plan.code,'app_pro_plan');
    }
  }
});

test('anonymous sessions make no request and an incompatible API response cannot erase subscription data', async () => {
  const h = harness(); const tokens = h.load('@/utils/auth/AuthTokens');
  assert.equal(await tokens.refreshTokensSilently(),'missing'); assert.equal(h.requests.length,0);
  const { storageTokens:keys } = h.settings.userTokenSettings;
  h.memory.set(keys.accessToken.name,token(true)); h.memory.set(keys.refreshToken.name,'refresh'); h.memory.set(keys.userData.name,account());
  h.setReply(async () => Response.json({ data:{ id:'user-id' } }));
  assert.equal(await tokens.refreshTokensSilently(),'failed');
  assert.equal(h.memory.get(keys.userData.name).subscription.plan.code,'app_pro_plan');
});


test('subscription pages refresh the shared user cache through app auth', async () => {
  const h = harness(); const { storageTokens:keys } = h.settings.userTokenSettings;
  h.memory.set(keys.accessToken.name,token()); h.memory.set(keys.refreshToken.name,'refresh');
  h.setReply(async () => Response.json({ data:account() }));
  const data = await h.load('@/helpers/subscription/api').getCurrentSubscription(new AbortController().signal);
  assert.equal(data.plan.code,'app_pro_plan');
  assert.equal(data.subscription.id,'sub-id');
  assert.equal(h.memory.get(keys.userData.name).subscription.plan.code,'app_pro_plan');
  assert.equal(h.requests.length,1);
});

test('saving a billing address refreshes the full app user cache and preserves its plan', async () => {
  const h = harness(); const { storageTokens:keys } = h.settings.userTokenSettings;
  h.memory.set(keys.accessToken.name,token()); h.memory.set(keys.refreshToken.name,'refresh');
  const billing_address = { name:'Test Buyer',line_1:'1 Test Street',line_2:'',city:'Test City',state:'Test State',postal_code:'12345',country:'IN' };
  h.setReply(async () => Response.json({ data:{ ...account(),billing_address } }));
  await h.load('@/helpers/subscription/billingAddress').saveAppBillingAddress(billing_address);
  assert.equal(h.billingRequests[0].url.pathname,'/app/auth/user/billing_address');
  assert.deepEqual(h.billingRequests[0].data,billing_address);
  assert.deepEqual(h.memory.get(keys.userData.name).billing_address,billing_address);
  assert.equal(h.memory.get(keys.userData.name).subscription.plan.code,'app_pro_plan');
  assert.equal(h.requests.length,1);
});

test('plan catalogue requests carry the saved billing country without substituting device country', async () => {
  const h = harness();
  const { getAppPlanCatalogue } = h.load('@/helpers/subscription/plans');
  for (const country of ['IN','GB']) {
    await getAppPlanCatalogue({ country,provider:'app_store' });
    const request = h.billingRequests.at(-1);
    assert.equal(request.url.pathname,'/app/subscriptions/plans');
    assert.equal(request.url.searchParams.get('country'),country);
    assert.equal(request.url.searchParams.get('provider'),'app_store');
  }
});

test('Pro orders send the selected price and nested billing snapshot while retaining server totals', async () => {
  const h = harness();
  const billingAddress = { name:'Test Buyer',line_1:'1 Test Street',line_2:'',city:'Vadodara',state:'Gujarat',postal_code:'390007',country:'IN' };
  const order = await h.load('@/utils/payment_providers/Razorpay').createOrder({ priceId:'price-id',billingAddress,email:'buyer@example.test' });
  const request = h.billingRequests[0];
  assert.equal(request.url.pathname,'/app/subscriptions/orders');
  assert.equal(request.data.item_price_id,'price-id');
  assert.equal(request.data.quantity,1);
  assert.equal(request.data.provider,'razorpay');
  assert.equal(request.data.billing_details.name,'Test Buyer');
  assert.equal(request.data.billing_details.address.country,'IN');
  assert.equal(request.data.billing_details.address.name,undefined);
  assert.equal(request.data.total_amount,undefined);
  assert.equal(request.data.user_id,undefined);
  assert.equal(order.status,'pending');
  assert.equal(order.total_amount,24900);
});

test('Razorpay payment initialization submits only the owned order UID', async () => {
  const h = harness();
  await h.load('@/utils/payment_providers/Razorpay').createPayment('odr_test');
  const request = h.billingRequests[0];
  assert.equal(request.url.pathname,'/app/subscriptions/orders/payment');
  assert.deepEqual(Object.keys(request.data),['order_uid']);
  assert.equal(request.data.order_uid,'odr_test');
});

test('Razorpay verification submits the signed subscription callback and preserves server pending status', async () => {
  const h = harness();
  const result = await h.load('@/utils/payment_providers/Razorpay').verifyPayment('odr_test',{
    razorpay_payment_id:'pay_test',razorpay_subscription_id:'sub_test',razorpay_signature:'signed',status:'paid',total_amount:1
  });
  const request = h.billingRequests[0];
  assert.equal(request.url.pathname,'/app/subscriptions/orders/payment/verify');
  assert.equal(request.data.razorpay_subscription_id,'sub_test');
  assert.equal(request.data.razorpay_signature,'signed');
  assert.equal(request.data.status,undefined);
  assert.equal(request.data.total_amount,undefined);
  assert.equal(result.order.status,'pending');
});

test('Razorpay reconciliation checks an existing order without creating a replacement purchase', async () => {
  const h = harness();
  const result = await h.load('@/utils/payment_providers/Razorpay').reconcilePayment('odr_test');
  assert.equal(h.billingRequests[0].url.pathname,'/app/subscriptions/orders/payment/reconcile');
  assert.equal(h.billingRequests[0].data.order_uid,'odr_test');
  assert.equal(h.billingRequests[1].url.pathname,'/app/subscriptions/orders');
  assert.equal(result.order.uid,'odr_test');
});

test('native checkout uses server amounts and recurring agreement IDs and returns the signed callback', async () => {
  const h = harness();
  const result = await h.load('@/utils/payment_providers/Razorpay').openCheckout({
    provider:'razorpay',key_id:'rzp_test_public',name:'UnoQR',description:'Pro',amount:199900,currency:'INR',subscription_id:'sub_server'
  });
  assert.equal(h.checkoutRequests[0].key,'rzp_test_public');
  assert.equal(h.checkoutRequests[0].amount,199900);
  assert.equal(h.checkoutRequests[0].subscription_id,'sub_server');
  assert.equal(h.checkoutRequests[0].order_id,undefined);
  assert.equal(result.razorpay_signature,'signed');
  assert.equal(result.razorpay_subscription_id,'sub_server');
});
