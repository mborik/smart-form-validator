import { bindable, autoinject, customAttribute } from 'aurelia-framework';
import { Controller } from 'aurelia-templating';

@autoinject
@customAttribute('smart')
export class SmartFormElement {
	@bindable({ primaryProperty: true }) id: string;

	public message: string = '';
	public valid: boolean = false;

	constructor(private $el: Element) {}

	bind() {
		this.message = `${this.id} is ${this.valid ? 'valid' : 'invalid'}`;
	}
}
