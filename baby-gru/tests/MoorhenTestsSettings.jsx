import process from 'node:process';
let moorhen_test_use_gemmi=false;
const use_gemmi_env = process.env.MOORHEN_TEST_USE_GEMMI;

if(use_gemmi_env){
    if(use_gemmi_env==="1"||use_gemmi_env.toLowerCase()=="true"){
        moorhen_test_use_gemmi=true;
    }
}

export default moorhen_test_use_gemmi;
