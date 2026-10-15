'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('ingilizce/google-login.js','utf8');
test('new Google registration has three steps and navigation buttons',()=>{
  for(const i of [0,1,2])assert.ok(src.includes('data-register-step="'+i+'"'));
  for(const id of ['googleYeniGeri','googleYeniIleri','googleYeniGonder','googleMevcutHesap'])assert.ok(src.includes(id));
  assert.match(src,/Hesabım Var · Giriş Yap/);
});
test('only active step enabled and advancing validates stage fields',()=>{
  assert.match(src,/step\.hidden = i !== registrationStep/);
  assert.match(src,/input\.disabled = i !== registrationStep/);
  assert.match(src,/field\.reportValidity\(\)/);
  assert.match(src,/displayRegistrationStep\(registrationStep - 1\)/);
  assert.match(src,/displayRegistrationStep\(registrationStep \+ 1\)/);
});
