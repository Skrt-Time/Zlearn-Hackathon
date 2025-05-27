program certify_data.aleo;

record EntrepriseData:
    owner as address.private;
    ca as u64.private;
    dette as u64.private;

record Certify_EntrepriseData:
    owner as address.private;
    ca as u64.private;
    dette as u64.private;

function init_data:
    input r0 as u64.private;
    input r1 as u64.private;
    input r2 as address.private;
    is.eq self.caller r2 into r3;
    assert.eq r3 true;
    cast r2 r0 r1 into r4 as EntrepriseData.record;
    output r4 as EntrepriseData.record;

function validate_data:
    input r0 as EntrepriseData.record;
    input r1 as address.private;
    input r2 as signature.private;
    is.eq self.caller r1 into r3;
    assert.eq r3 true;
    hash.bhp256 r0 into r4 as scalar;
    sign.verify r2 r1 r4 into r5;
    assert.eq r5 true;
    cast r0.owner r0.ca r0.dette into r6 as Certify_EntrepriseData.record;
    output r6 as Certify_EntrepriseData.record;
