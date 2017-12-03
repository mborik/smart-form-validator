import { bindable, autoinject } from 'aurelia-framework';
import { Controller } from 'aurelia-templating';
import { App } from './app';
import { SmartFormElement } from 'src/element';

@autoinject()
export class Popup {
	@bindable element: HTMLDivElement;
	@bindable type: string = '';
	@bindable icon: string = '';
	@bindable title: string = '';
	@bindable equation: string = '';
	@bindable message: string = '';

	constructor() {}

	private attached() {
		$('[smart]').on('focus blur', this.eventHandler.bind(this));
	}

	private eventHandler(e: JQueryEventObject) {
		e.preventDefault();
		let el = $(e.currentTarget);
		let smart: Controller = (<any> e.currentTarget).au['smart'];
		let model: SmartFormElement = <SmartFormElement> smart.viewModel;

		if (e.type === 'blur') {
			return $(this.element).css({
				left: -1000,
				top: -1000,
				opacity: 0
			});
		}

		this.type = model.valid ? 'positive' : 'negative';
		this.icon = model.valid ? 'check' : 'warning';
		this.title = model.message;

		let pos = el.offset();
		return $(this.element).css({
			left: pos.left + el.outerWidth(),
			top: pos.top,
			opacity: 1
		});
	}
}
