import { bindable, autoinject } from 'aurelia-framework';
import { Controller } from 'aurelia-templating';
import { SmartFormElement } from './element';

@autoinject()
export class Tooltip {
	@bindable element: HTMLDivElement;
	@bindable type: string = '';
	@bindable icon: string = '';
	@bindable title: string = '';
	@bindable equation: string = '';
	@bindable message: string = '';

	constructor() {}

	private attached() {
		$('smart>input').on('focus blur', this.eventHandler.bind(this));
	}

	private eventHandler(e: JQueryEventObject) {
		e.preventDefault();
		let el = $(e.currentTarget);

		if (e.type === 'blur') {
			return $(this.element).css({
				left: -1000,
				top: -1000,
				opacity: 0
			});
		}

		let pos = el.offset();
		return $(this.element).css({
			left: pos.left + el.outerWidth(),
			top: pos.top,
			opacity: 1
		});
	}
}
