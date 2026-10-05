import { setWasmUrl } from "@lottiefiles/dotlottie-react";

/*
 * The web Lottie player is WebAssembly. By default it downloads that from a
 * public CDN on first use; we serve our own copy (public/, copied from
 * @lottiefiles/dotlottie-web) so the mascot never depends on a third party
 * being up. Re-copy it when that package is upgraded.
 */
setWasmUrl("/dotlottie-player.wasm");
