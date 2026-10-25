import { Body, Controller, Get, Headers, HttpCode, Ip, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RecordsService } from './records.service';

@Controller()
export class RecordsController {
  constructor(private records: RecordsService) {}

  /* Orders */
  @Post('orders')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  placeOrder(@Body() body: any, @Headers('idempotency-key') idem?: string) {
    return this.records.placeOrder(body, idem);
  }
  @Get('orders/:token')
  order(@Param('token') token: string) {
    return this.records.orderByToken(token);
  }
  @Post('orders/:token/cancel')
  @HttpCode(200)
  cancelOrder(@Param('token') token: string, @Body() body: any) {
    return this.records.cancelOrder(token, body?.reason);
  }
  @Post('orders/:token/payments')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  orderPayment(@Param('token') token: string, @Body() body: any) {
    return this.records.submitOrderPayment(token, body);
  }

  /* Requests */
  @Post('requests/custom')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  custom(@Body() body: any, @Headers('idempotency-key') idem?: string) {
    return this.records.createCustom(body, idem);
  }
  @Post('requests/bookings/:serviceId')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  booking(@Param('serviceId') serviceId: string, @Body() body: any, @Headers('idempotency-key') idem?: string) {
    return this.records.createBooking(serviceId, body, idem);
  }
  @Post('requests/corporate')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  corporate(@Body() body: any, @Headers('idempotency-key') idem?: string) {
    return this.records.createCorporate(body, idem);
  }
  @Get('requests/:token')
  request(@Param('token') token: string) {
    return this.records.requestByToken(token);
  }
  @Post('requests/:token/quote/respond')
  @HttpCode(200)
  respond(@Param('token') token: string, @Body() body: any) {
    return this.records.respondQuote(token, body?.accept === true, body?.reason);
  }
  @Post('requests/:token/payments')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  requestPayment(@Param('token') token: string, @Body() body: any) {
    return this.records.submitRequestPayment(token, body);
  }
  @Post('requests/:token/reschedule')
  @HttpCode(200)
  reschedule(@Param('token') token: string, @Body() body: any) {
    return this.records.reschedule(token, body);
  }
  @Post('requests/:token/cancel')
  @HttpCode(200)
  cancelRequest(@Param('token') token: string, @Body() body: any) {
    return this.records.cancelRequest(token, body?.reason);
  }

  /* Track an order or request by reference + phone */
  @Post('track')
  @HttpCode(200)
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  track(@Ip() ip: string, @Body() body: any) {
    return this.records.track(ip, body);
  }
}
