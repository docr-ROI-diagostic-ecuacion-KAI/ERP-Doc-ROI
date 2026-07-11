(function(){
  try {
    if (typeof state !== "undefined") globalThis.state = state;
    if (typeof modules !== "undefined") globalThis.modules = modules;
    if (typeof moduleConfig !== "undefined") globalThis.moduleConfig = moduleConfig;
    if (typeof nav !== "undefined") globalThis.nav = nav;
    if (typeof navItems !== "undefined") globalThis.navItems = navItems;
    globalThis.__docroiRuntimeBridge = "20260711";
  } catch (error) {
    console.warn("DocROI runtime bridge could not expose state", error);
  }
})();
