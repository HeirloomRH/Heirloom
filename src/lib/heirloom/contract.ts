/** Heirloom token contract address on Robinhood Chain. */
export const CONTRACT_ADDRESS = "0xa6e6a94208a481fa73e5083d8e54c01f7a7e04ed";

/** DexScreener lookup for the contract, chain-slug agnostic. */
export const CONTRACT_DEXSCREENER_URL = `https://dexscreener.com/search?q=${CONTRACT_ADDRESS}`;

/** Renders an address as `0xa6e6a9…04ed` for display in tight layouts. */
export function shortenAddress(address: string, lead = 8, tail = 4) {
  if (address.length <= lead + tail) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}
