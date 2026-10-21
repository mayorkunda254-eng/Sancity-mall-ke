const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
const source=fs.readFileSync('src/AdminPage.jsx','utf8');
const state={};let payload,filters=[],writes=0,conflict=false;
const emptyForm={name:'',category:'Kitchen & Dining',subcategory:'',price:'',compare_at_price:'',stock_quantity:'0',price_from:false,status:'published',description:'',dimensions:'',material:'',colour:'',key_features:'',care_instructions:'',delivery_note:'',badge:''};
const request={eq(k,v){filters.push([k,v]);return this},select(){return this},async single(){return conflict?{data:null,error:{code:'PGRST116'}}:{data:{id:'existing'},error:null}}};
const ctx={emptyForm,form:{...emptyForm},editingProduct:null,submitting:false,async loadProducts(){},switchAdminView(){},supabase:{from(table){assert.equal(table,'products');return{update(value){writes++;payload=value;return request}}}}};
for(const name of ['Form','EditingProduct','Files','Notice','ProductWorkspace','Submitting'])ctx['set'+name]=value=>{state[name]=value;if(name==='Form')ctx.form=value;if(name==='EditingProduct')ctx.editingProduct=value;if(name==='Submitting')ctx.submitting=value};
vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  function editProduct(product)'),source.indexOf('  async function createProduct(event)')),ctx);
(async()=>{
const original={id:'existing',updated_at:'2026-10-21T00:00:00Z',name:'Original',category:'Kitchen & Dining',price:0,stock_quantity:0,slug:'keep-this-url',product_images:[{id:'image'}],product_variants:[{id:'variant'}]};
ctx.editProduct(original);assert.equal(ctx.form.price,0);assert.equal(ctx.form.description,'');assert.equal(state.ProductWorkspace,'add');
ctx.form.name='Updated';ctx.form.price='1700';ctx.form.stock_quantity='4';await ctx.saveProductEdit({preventDefault(){}});
assert.equal(writes,1);assert.equal(payload.price,1700);assert.equal(payload.stock_quantity,4);assert.deepEqual(filters,[['id','existing'],['updated_at',original.updated_at]]);
for(const field of ['slug','id','product_images','product_variants'])assert.ok(!(field in payload));assert.equal(state.ProductWorkspace,'catalogue');assert.equal(state.EditingProduct,null);
ctx.editProduct(original);ctx.form.price='-1';await ctx.saveProductEdit({preventDefault(){}});assert.equal(writes,1);assert.equal(ctx.editingProduct.id,'existing');
ctx.form.price='';conflict=true;await ctx.saveProductEdit({preventDefault(){}});assert.equal(payload.price,null);assert.match(state.Notice.text,/changed or is no longer/);assert.equal(ctx.editingProduct.id,'existing');assert.equal(state.Submitting,false);
ctx.cancelProductEdit();assert.equal(ctx.editingProduct,null);assert.equal(state.ProductWorkspace,'catalogue');
console.log('PASS: prefill, zero values, update existing ID, URL/photo/variant preservation, price validation, blank price, conflict handling and cancel. Database mocked.');
})().catch(error=>{console.error(error);process.exit(1)});
