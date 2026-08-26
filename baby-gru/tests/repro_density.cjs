// Standalone reproduction of density_correlation_analysis crash
// Mirrors tests/__tests__/molecules_container.test.js setup but ONLY runs
// the density-correlation path, so we can see exactly where it breaks.
const fs = require('fs')
const path = require('path')
const { ungzip } = require('node-gzip')

const createCootModule = require('../public/MoorhenAssets/wasm/moorhen64')

const TEST_DATA = path.join(__dirname, 'test_data')

async function main() {
  console.log('Loading wasm module...')
  const cootModule = await createCootModule({
    print: (t) => console.log('[wasm-out]', t),
    printErr: (t) => console.log('[wasm-err]', t),
  })
  console.log('wasm loaded OK')

  // copy test data into the wasm FS
  for (const fileName of ['5a3h.pdb', '5a3h_sigmaa.mtz']) {
    const buf = fs.readFileSync(path.join(TEST_DATA, fileName))
    cootModule.FS_createDataFile('.', fileName, buf, true, true)
    console.log('created FS file', fileName, buf.length)
  }
  cootModule.FS.mkdir('COOT_BACKUP')
  const zipped = fs.readFileSync(path.join(__dirname, '..', 'public', 'MoorhenAssets', 'data.tar.gz'))
  const cootData = await ungzip(zipped)
  cootModule.FS.mkdir('data_tmp')
  cootModule.FS_createDataFile('data_tmp', 'data.tar', cootData, true, true)
  cootModule.unpackCootDataFile('data_tmp/data.tar', false, '', '')
  cootModule.FS_unlink('data_tmp/data.tar')
  console.log('coot data unpacked')

  const mc = new cootModule.molecules_container_js(false)
  mc.set_use_gemmi(false)
  mc.set_show_timings(false)
  console.log('molecules_container created')

  const imol = mc.read_pdb('./5a3h.pdb')
  console.log('read_pdb ->', imol)
  const imol_map = mc.read_mtz('./5a3h_sigmaa.mtz', 'FWT', 'PHWT', '', false, false)
  console.log('read_mtz ->', imol_map)

  console.log('valid model?', mc.is_valid_model_molecule(imol), ' valid map?', mc.is_valid_map_molecule(imol_map))

  console.log('CALLING density_correlation_analysis...')
  const info = mc.density_correlation_analysis(imol, imol_map)
  console.log('density_correlation_analysis returned OK; name=', info.name, 'type=', info.type)
  const cviv = info.cviv
  console.log('cviv.size() =', cviv.size())
  for (let i = 0; i < cviv.size(); i++) {
    const chain = cviv.get(i)
    console.log('  chain', chain.chain_id, 'n residues', chain.rviv.size())
  }
  cviv.delete()
  info.delete()
  console.log('ALL OK - no crash')
}

main().catch((e) => {
  console.error('REPRO FAILED:', e)
  process.exit(1)
})
