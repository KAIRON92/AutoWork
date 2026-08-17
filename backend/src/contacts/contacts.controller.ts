import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService, CreateContactDto } from './contacts.service';
import { Roles } from '../auth/roles.decorator';

function currentOrgId(req: any): string {
  const orgId = req.user?.orgId;
  if (!orgId) throw new UnauthorizedException('Organization context is missing');
  return orgId;
}

@ApiTags('Contacts & Lists')
@ApiBearerAuth()
@Controller('api/v1')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Get('contacts')
  @ApiOperation({ summary: 'List all contacts with search and list memberships' })
  async findAllContacts(@Query('search') search: string, @Request() req: any) {
    return this.contactsService.findAllContacts(currentOrgId(req), search);
  }

  @Get('contacts/:id')
  @ApiOperation({ summary: 'Get single contact details' })
  async findOneContact(@Param('id') id: string, @Request() req: any) {
    return this.contactsService.findOneContact(id, currentOrgId(req));
  }

  @Post('contacts')
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Create a new contact' })
  async createContact(@Body() dto: CreateContactDto, @Request() req: any) {
    return this.contactsService.createContact(currentOrgId(req), dto);
  }

  @Put('contacts/:id')
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Update contact details' })
  async updateContact(@Param('id') id: string, @Body() dto: Partial<CreateContactDto>, @Request() req: any) {
    return this.contactsService.updateContact(id, currentOrgId(req), dto);
  }

  @Delete('contacts/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete contact' })
  async removeContact(@Param('id') id: string, @Request() req: any) {
    return this.contactsService.removeContact(id, currentOrgId(req));
  }

  @Get('contact-lists')
  @ApiOperation({ summary: 'List all contact lists' })
  async findAllLists(@Request() req: any) {
    return this.contactsService.findAllLists(currentOrgId(req));
  }

  @Get('contact-lists/:id')
  @ApiOperation({ summary: 'Get contact list and its members' })
  async findOneList(@Param('id') id: string, @Request() req: any) {
    return this.contactsService.findOneList(id, currentOrgId(req));
  }

  @Post('contact-lists')
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Create a new contact list' })
  async createList(@Body() body: { name: string; description?: string }, @Request() req: any) {
    return this.contactsService.createList(currentOrgId(req), body.name, body.description);
  }

  @Delete('contact-lists/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a contact list' })
  async removeList(@Param('id') id: string, @Request() req: any) {
    return this.contactsService.removeList(id, currentOrgId(req));
  }
}
