import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';

@ApiTags('Contacts & Imports')
@Controller()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('contacts')
  @ApiOperation({ summary: 'Get all contacts' })
  findAllContacts() {
    return this.contactsService.findAllContacts();
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Create single contact' })
  createContact(@Body() body: any) {
    return this.contactsService.createContact(body);
  }

  @Get('contact-lists')
  @ApiOperation({ summary: 'Get all contact lists' })
  findAllLists() {
    return this.contactsService.findAllLists();
  }

  @Post('contact-lists')
  @ApiOperation({ summary: 'Create contact list' })
  createList(@Body() body: { name: string; description?: string }) {
    return this.contactsService.createList(body.name, body.description);
  }
}
