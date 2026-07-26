/**
 * afterSign hook for electron-builder — macOS notarization.
 * Only runs when CSC_LINK + APPLE_NOTARIZATION_ credentials are set (CI).
 *
 * Adapted from electron-builder's notarize example.
 */
export default async function afterSign(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') {
    return
  }

  const appId = 'com.deskclaw.code-editor'
  const appName = context.packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`

  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_ID_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('  [notarize] Skipping notarization: APPLE_ID, APPLE_ID_PASSWORD, or APPLE_TEAM_ID not set')
    return
  }

  const { notarize } = await import('@electron/notarize')
  console.log(`  [notarize] Notarizing ${appPath} (${appId})...`)
  try {
    await notarize({
      appPath,
      appBundleId: appId,
      appleId,
      appleIdPassword,
      teamId,
    })
    console.log('  [notarize] Notarization complete')
  } catch (err) {
    console.error('  [notarize] Notarization failed:', err.message || err)
    throw err
  }
}
