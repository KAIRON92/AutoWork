import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';

@ApiTags('Email Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all connected sending accounts' })
  findAll() {
    return this.accountsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Connect new sending account' })
  create(@Body() body: { name: string; email: string; provider: string; dailyLimit?: number }) {
    return this.accountsService.create(body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Toggle account active/paused status' })
  toggleStatus(@Param('id') id: string) {
    return this.accountsService.toggleStatus(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disconnect sending account' })
  remove(@Param('id') id: string) {
    return this.accountsService.remove(id);
  }
}
