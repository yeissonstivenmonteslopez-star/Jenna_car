// Visual regression checks; API responses are fixtures, never production data.
// Run from the project root with Vite running and Playwright available.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
await mkdir('.test-tmp-design', { recursive: true })
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {})})
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:5180'
const context=await browser.newContext({viewport:{width:1440,height:1000}})
await context.addInitScript(()=>{localStorage.setItem('jenna_car_token','fake');localStorage.setItem('jenna_car_user',JSON.stringify({nombre:'Ana',rol:'admin'}))})
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let role='admin';let photoRequests=0
await page.route('**/api/**',async route=>{
 const path=new URL(route.request().url()).pathname;let body={data:[]}
 if(path==='/api/mechanic/images/1'){photoRequests++;await route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1sAAAAASUVORK5CYII=','base64')});return}
 if(path==='/api/auth/me')body={user:{id:1,nombre:'Ana',apellido:'García',email:'qa@example.invalid',telefono:'3000000000',rol:role}}
 if(path==='/api/admin/dashboard')body={data:{usuarios:15,clientes:12,vehiculos:18,citas_pendientes:6,citas_hoy:4,ordenes_pendientes:3,ordenes_reparacion:5,ordenes_terminadas:9,recibos_pendientes:3,recibos_pagados:7,ingresos_totales:1250000,citas_recientes:[{id:1,fecha:'2026-11-12',hora:'10:00',cliente:'Ana García',vehiculo:'Toyota Corolla · ABC123',servicio:'Revisión de frenos',estado:'pendiente'}],ordenes_recientes:[],pagos_recientes:[]}}
 if(path==='/api/mechanic/appointments')body={data:[{id:1,fecha:'2026-11-12',hora:'10:00',cliente_nombre:'Ana García',marca:'Toyota',modelo:'Corolla',placa:'ABC123',servicio:'Frenos',estado:'confirmada'}]}
 if(path==='/api/mechanic/appointments/1')body={data:{id:1,fecha:'2026-11-12',hora:'10:00',estado:'confirmada',motivo:'Revisión',cliente:{nombre:'Ana',apellido:'García',email:'qa@example.invalid'},vehiculo:{placa:'ABC123',marca:'Toyota',modelo:'Corolla',anio:2020},servicio:'Frenos',diagnosticos:[{id:1,descripcion:'Desgaste de pastillas',observaciones:'Revisión en curso',solucion_recomendada:'Reemplazo'}],trabajos:[{id:1,descripcion:'Cambio de pastillas',estado:'en_proceso',cantidad:1,subtotal:150000}],ordenes:[{id:1,estado:'en_reparacion',total:150000}],imagenes:[{id:1,descripcion:'Foto de prueba',created_at:'2030-01-01T10:00:00'}]}}
 if(path==='/api/vehiculos')body={data:[{id:1,marca:'Toyota',modelo:'Corolla',placa:'ABC123',anio:2020,color:'Gris',estado:'activo'},{id:2,marca:'Mazda',modelo:'3',placa:'XYZ456',anio:2023,color:'Rojo',estado:'activo'}]}
 if(path==='/api/citas/mis-citas')body={data:[{id:1,fecha:'2026-12-15',hora:'10:00:00',estado:'confirmada',servicio:{name:'Mantenimiento preventivo'},vehiculo:{id:1,marca:'Toyota',modelo:'Corolla',placa:'ABC123'}}]}
 await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)})
})
try{
 await page.goto(origin+'/admin/dashboard');await page.getByRole('heading',{name:'Resumen del taller'}).waitFor();assert.equal(new URL(page.url()).pathname,'/admin/dashboard');await page.reload();await page.getByRole('heading',{name:'Resumen del taller'}).waitFor();await page.screenshot({path:'.test-tmp-design/admin.png',fullPage:true})
 assert.equal(await page.locator('.dashboard-metrics > a').count(),4)
 await page.getByRole('button',{name:'Contraer menú lateral'}).click();assert.equal(await page.locator('.admin-sidebar').evaluate(e=>Math.round(e.getBoundingClientRect().width)),76)
 await page.getByRole('button',{name:'Expandir menú lateral'}).click();await page.getByRole('link',{name:'Citas',exact:true}).click();await page.getByRole('heading',{name:'Citas',exact:true}).waitFor();await page.screenshot({path:'.test-tmp-design/admin-citas.png',fullPage:true})
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/admin/dashboard');await page.getByRole('heading',{name:'Resumen del taller'}).waitFor();await page.screenshot({path:'.test-tmp-design/admin-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 role='mecanico';await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/mechanic');await page.getByRole('heading',{name:'Panel mecánico'}).waitFor();await page.getByRole('button',{name:/Ana García/}).click();await page.getByText('Cambio de pastillas',{exact:true}).waitFor();await page.getByRole('img',{name:'Foto de prueba',exact:true}).waitFor();assert.ok(photoRequests >= 1 && photoRequests <= 2); /* StrictMode repeats mount effects in development. */await page.screenshot({path:'.test-tmp-design/mechanic.png',fullPage:true})
 role='usuario';await page.goto(origin+'/profile');await page.getByRole('heading',{name:'Citas y actividad reciente'}).waitFor();await page.getByRole('heading',{name:'Mantenimiento preventivo'}).waitFor();await page.screenshot({path:'.test-tmp-design/profile.png',fullPage:true})
 await page.getByRole('button',{name:'Modo oscuro',exact:true}).click();assert.equal(await page.locator('.workspace-ui').getAttribute('data-theme'),'dark');await page.screenshot({path:'.test-tmp-design/profile-dark.png',fullPage:true})
 await page.reload();await page.getByRole('heading',{name:'Citas y actividad reciente'}).waitFor();assert.equal(await page.locator('.workspace-ui').getAttribute('data-theme'),'dark')
 assert.equal(await page.locator('main').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(16, 16, 16)')
 await page.getByRole('heading',{name:'Mazda 3'}).waitFor()
 await page.getByRole('button',{name:'Editar perfil'}).click();await page.getByRole('heading',{name:'Tu perfil'}).waitFor();assert.equal(await page.getByRole('textbox',{name:'Nombre',exact:true}).inputValue(),'Ana')
 await page.getByRole('button',{name:'Volver a mi perfil',exact:false}).click()
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.test-tmp-design/profile-dark-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.goto(origin+'/mis-recibos');assert.equal(await page.locator('.workspace-ui').getAttribute('data-theme'),'dark');await page.getByRole('button',{name:'Modo claro',exact:true}).click();assert.equal(await page.locator('.workspace-ui').getAttribute('data-theme'),'light');await page.goto(origin+'/profile');await page.getByRole('heading',{name:'Citas y actividad reciente'}).waitFor()

 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.evaluate(()=>{localStorage.removeItem('jenna_car_token');localStorage.removeItem('jenna_car_user')})
 for(const path of ['/','/sign-in','/register']){await page.goto(origin+''+path);assert.equal(await page.locator('.workspace-ui').count(),0)}
 assert.deepEqual(errors,[]);console.log('PASS: dashboard, sidebar, route navigation, mobile overflow, mechanic and public-page scope')
}finally{await browser.close()}
