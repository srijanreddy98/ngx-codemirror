import {
  forwardRef,
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import * as codemirror from 'codemirror';
import isEqual from 'lodash-es/isEqual';

function normalizeLineEndings(str) {
  if (!str) {
    return str;
  }
  return str.replace(/\r\n|\r/g, '\n');
}

@Component({
  selector: 'ngx-codemirror',
  template: `
  <textarea
    [name]="name"
    class="ngx-codemirror {{ className }}"
    [class.ngx-codemirror--focused]="isFocused"
    autocomplete="off"
    [autofocus]="autoFocus"
    #ref>
  </textarea>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CodemirrorComponent),
      multi: true,
    },
  ],
})
export class CodemirrorComponent
  implements AfterViewInit, OnDestroy, ControlValueAccessor, OnChanges {
  @Input() className: string;
  @Input() name: string;
  @Input() autoFocus = false;
  @Input() options: any = {};
  @Input() path: string;
  @Input() preserveScrollPosition: boolean;
  @Output() cursorActivity = new EventEmitter<any>();
  @Output() focusChange = new EventEmitter<boolean>();
  @Output() scroll = new EventEmitter<CodeMirror.ScrollInfo>();
  @ViewChild('ref') ref: ElementRef;
  value = '';
  disabled = false;
  isFocused = false;
  codeMirror: CodeMirror.EditorFromTextArea;

  ngAfterViewInit() {
    this.codeMirror = codemirror.fromTextArea(
      this.ref.nativeElement,
      this.options,
    );
    this.codeMirror.on('change', this.codemirrorValueChanged.bind(this));
    this.codeMirror.on('cursorActivity', this.cursorActive.bind(this));
    this.codeMirror.on('focus', this.focusChanged.bind(this, true));
    this.codeMirror.on('blur', this.focusChanged.bind(this, false));
    this.codeMirror.on('scroll', this.scrollChanged.bind(this));
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (typeof changes.options.currentValue === 'object') {
      for (const optionName of Object.keys(changes.options.currentValue)) {
        this.setOptionIfChanged(
          optionName,
          changes.options.currentValue[optionName],
        );
      }
    }
  }
  ngOnDestroy() {
    // is there a lighter-weight way to remove the cm instance?
    if (this.codeMirror) {
      this.codeMirror.toTextArea();
    }
  }
  codemirrorValueChanged(doc, change) {
    if (change.origin !== 'setValue') {
      this.value = doc.getValue();
      this.writeValue(doc.getValue());
    }
  }
  setOptionIfChanged(optionName, newValue) {
    if (!this.codeMirror) {
      return;
    }
    const oldValue = this.codeMirror.getOption(optionName);
    if (!isEqual(oldValue, newValue)) {
      this.codeMirror.setOption(optionName, newValue);
    }
  }
  focusChanged(focused: boolean) {
    this.onTouched();
    this.isFocused = focused;
    this.focusChange.emit(focused);
  }
  scrollChanged(cm) {
    this.scroll.emit(cm.getScrollInfo());
  }
  cursorActive(cm) {
    this.cursorActivity.emit(cm);
  }

  /** Implemented as part of ControlValueAccessor. */
  writeValue(value: string): void {
    if (value === null) {
      return;
    }
    if (
      value &&
      value !== this.codeMirror.getValue() &&
      normalizeLineEndings(this.codeMirror.getValue()) !==
        normalizeLineEndings(value)
    ) {
      this.value = value;
      if (this.preserveScrollPosition) {
        const prevScrollPosition = this.codeMirror.getScrollInfo();
        this.codeMirror.setValue(this.value);
        this.codeMirror.scrollTo(
          prevScrollPosition.left,
          prevScrollPosition.top,
        );
      } else {
        this.codeMirror.setValue(this.value);
      }
    }
    this.onChange(this.value);
  }

  /** Implemented as part of ControlValueAccessor. */
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  /** Implemented as part of ControlValueAccessor. */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  /** Implemented as part of ControlValueAccessor. */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.setOptionIfChanged('readOnly', this.disabled);
  }
  /** Implemented as part of ControlValueAccessor. */
  private onChange = (_: any) => {};
  /** Implemented as part of ControlValueAccessor. */
  private onTouched = () => {};
}
