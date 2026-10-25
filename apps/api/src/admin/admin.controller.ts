import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { Actor } from '@flowtus/core';
import { AdminGuard, CurrentActor, Roles } from '../auth/admin.guard';
import { CatalogueAdminService } from './catalogue-admin.service';
import { MiscAdminService } from './misc-admin.service';
import { RecordsAdminService } from './records-admin.service';

/** Every route below requires a signed-in, active admin user; owner-only steps are enforced by @Roles and again inside the rules. */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private records: RecordsAdminService, private catalogue: CatalogueAdminService, private misc: MiscAdminService) {}

  /* Overview, calendar, audit, tests, demo */
  @Get('overview') overview() { return this.misc.overview(); }
  @Get('calendar') calendar() { return this.misc.calendar(); }
  @Get('audit') audit() { return this.misc.audit(); }
  @Post('tests/run') @HttpCode(200) tests() { return this.misc.tests(); }
  @Post('demo/sample') @HttpCode(200) sample(@CurrentActor() a: Actor) { return this.misc.loadSample(a); }
  @Post('demo/reset') @HttpCode(200) reset(@CurrentActor() a: Actor, @Body() b: any) { return this.misc.resetDemo(a, b?.confirm); }

  /* Orders */
  @Get('orders') orders(@Query() q: any) { return this.records.listOrders(q); }
  @Get('orders/:number') order(@Param('number') n: string) { return this.records.getOrder(n); }
  @Post('orders/:number/transition') @HttpCode(200)
  orderTransition(@Param('number') n: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.transition('order', n, a, b?.to, b?.note); }
  @Post('orders/:number/rider') @HttpCode(200)
  rider(@Param('number') n: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.setRider(n, a, b?.rider); }
  @Post('orders/:number/notes') @HttpCode(200)
  orderNote(@Param('number') n: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.addNote('order', n, a, b?.text); }
  @Post('orders/:number/messages') @HttpCode(200)
  orderMsg(@Param('number') n: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.postMessage('order', n, a, b?.text); }
  @Post('orders/:number/payments/:payId/verify') @HttpCode(200) @Roles('owner')
  orderVerify(@Param('number') n: string, @Param('payId') p: string, @CurrentActor() a: Actor) { return this.records.verifyPayment('order', n, p, a, true); }
  @Post('orders/:number/payments/:payId/reject') @HttpCode(200) @Roles('owner')
  orderReject(@Param('number') n: string, @Param('payId') p: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.verifyPayment('order', n, p, a, false, b?.reason); }
  @Post('orders/:number/cash') @HttpCode(200) @Roles('owner')
  cash(@Param('number') n: string, @CurrentActor() a: Actor) { return this.records.recordCash(n, a); }

  /* Requests & bookings */
  @Get('requests') requests(@Query() q: any) { return this.records.listRequests(q); }
  @Get('requests/:ref') request(@Param('ref') r: string) { return this.records.getRequest(r); }
  @Post('requests/:ref/transition') @HttpCode(200)
  reqTransition(@Param('ref') r: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.transition('request', r, a, b?.to, b?.note); }
  @Post('requests/:ref/team') @HttpCode(200)
  team(@Param('ref') r: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.setTeam(r, a, b?.team); }
  @Post('requests/:ref/notes') @HttpCode(200)
  reqNote(@Param('ref') r: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.addNote('request', r, a, b?.text); }
  @Post('requests/:ref/messages') @HttpCode(200)
  reqMsg(@Param('ref') r: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.postMessage('request', r, a, b?.text); }
  @Post('requests/:ref/quote') @HttpCode(200) @Roles('owner')
  quote(@Param('ref') r: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.sendQuote(r, a, b); }
  @Post('requests/:ref/quote/record') @HttpCode(200) @Roles('owner')
  record(@Param('ref') r: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.recordApproval(r, a, b?.accept !== false, b?.reason); }
  @Post('requests/:ref/payments/:payId/verify') @HttpCode(200) @Roles('owner')
  reqVerify(@Param('ref') r: string, @Param('payId') p: string, @CurrentActor() a: Actor) { return this.records.verifyPayment('request', r, p, a, true); }
  @Post('requests/:ref/payments/:payId/reject') @HttpCode(200) @Roles('owner')
  reqReject(@Param('ref') r: string, @Param('payId') p: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.verifyPayment('request', r, p, a, false, b?.reason); }
  @Post('requests/:ref/terms') @HttpCode(200) @Roles('owner')
  terms(@Param('ref') r: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.confirmTerms(r, a, b); }
  @Post('requests/:ref/deliveries/:id') @HttpCode(200)
  delivery(@Param('ref') r: string, @Param('id') id: string, @Body() b: any, @CurrentActor() a: Actor) { return this.records.setDeliveryStatus(r, a, id, b?.status, b?.note); }

  /* Catalogue */
  @Get('products') products() { return this.catalogue.listProducts(); }
  @Get('products/:id') product(@Param('id') id: string) { return this.catalogue.getProduct(id); }
  @Post('products') newProduct(@Body() b: any, @CurrentActor() a: Actor) { return this.catalogue.saveProduct(a, null, b); }
  @Put('products/:id') saveProduct(@Param('id') id: string, @Body() b: any, @CurrentActor() a: Actor) { return this.catalogue.saveProduct(a, id, b); }

  @Get('custom') custom() { return this.catalogue.listCustom(); }
  @Get('custom/:id') customItem(@Param('id') id: string) { return this.catalogue.getCustom(id); }
  @Post('custom') newCustom(@Body() b: any, @CurrentActor() a: Actor) { return this.catalogue.saveCustom(a, null, b); }
  @Put('custom/:id') saveCustom(@Param('id') id: string, @Body() b: any, @CurrentActor() a: Actor) { return this.catalogue.saveCustom(a, id, b); }

  @Get('services') services() { return this.catalogue.listServices(); }
  @Get('services/:id') service(@Param('id') id: string) { return this.catalogue.getService(id); }
  @Put('services/:id') saveService(@Param('id') id: string, @Body() b: any, @CurrentActor() a: Actor) { return this.catalogue.saveService(a, id, b); }

  @Get('delivery') getDelivery() { return this.catalogue.getDelivery(); }
  @Put('delivery') saveDelivery(@Body() b: any, @CurrentActor() a: Actor) { return this.catalogue.saveDelivery(a, b); }

  @Get('settings') @Roles('owner') getSettings() { return this.catalogue.getSettings(); }
  @Put('settings') @Roles('owner') saveSettings(@Body() b: any, @CurrentActor() a: Actor) { return this.catalogue.saveSettings(a, b); }

  @Post('blocks') addBlock(@Body() b: any, @CurrentActor() a: Actor) { return this.catalogue.addBlock(a, b); }
  @Delete('blocks/:id') removeBlock(@Param('id') id: string, @CurrentActor() a: Actor) { return this.catalogue.removeBlock(a, id); }
}
