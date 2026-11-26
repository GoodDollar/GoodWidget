import React from 'react'
import antseedSignerRow from '../../assets/antseed-signer-row.png'

/**
 * Screenshot of Antseed Desktop's Settings → Wallet → Signer key row.
 *
 * Back up is circled in green and Import in orange; the numbered steps above
 * the image tell the user which one to press.
 */
export function AntseedSignerRow() {
  return (
    <img
      src={antseedSignerRow}
      alt="The Signer key row in Antseed Desktop's Settings → Wallet, with the Back up button circled in green and the Import button circled in orange"
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
    />
  )
}
