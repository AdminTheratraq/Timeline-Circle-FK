/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataViewObjects = powerbi.DataViewObjects;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import * as d3 from 'd3';
import { VisualSettings } from "./settings";
import * as sanitizeHtml from 'sanitize-html';

export interface CardData {
    Fields: String;
}

export interface Cards {
    Timeline: CardData[];
}

export function logExceptions(): MethodDecorator {
    return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>)
        : TypedPropertyDescriptor<any> => {

        return {
            value: function () {
                try {
                    return descriptor.value.apply(this, arguments);
                } catch (e) {
                    // this.svg.append('text').text(e).style("stroke","black")
                    // .attr("dy", "1em");
                    throw e;
                }
            }
        };
    };
}

export function getCategoricalObjectValue<T>(objects: DataViewObjects, index: number, objectName: string, propertyName: string, defaultValue: T): T {
    if (objects) {
        let object = objects[objectName];
        if (object) {
            let property: T = <T>object[propertyName];
            if (property !== undefined) {
                return property;
            }
        }
    }
    return defaultValue;
}

export class Visual implements IVisual {
    private target: d3.Selection<HTMLElement, any, any, any>;
    private margin = { top: 50, right: 40, bottom: 50, left: 40 };
    private settings: VisualSettings;
    private host: IVisualHost;
    private events: IVisualEventService;
    private xScale: d3.ScaleTime<number, number>;
    private yScale: d3.ScaleLinear<number, number>;
    private gbox: d3.Selection<SVGElement, any, any, any>;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual Constructor', options);
        this.target = d3.select(options.element).append('div');
        this.host = options.host;
        this.events = options.host.eventService;
    }

    @logExceptions()
    public update(options: VisualUpdateOptions) {
        console.log('Visual Update ', options);
        debugger;
        this.events.renderingStarted(options);
        this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
        this.target.selectAll('*').remove();
        let _this = this;
        let vpWidth = (options.viewport.width);
        let vpHeight = (options.viewport.height);
        this.target.attr('style', 'width:' + vpWidth + 'px;height:' + vpHeight + 'px;');
        this.target.attr('class', 'card-container');

        let gHeight = vpHeight - this.margin.top - this.margin.bottom;
        let gWidth = vpWidth - this.margin.left - this.margin.right;

        let cardData = Visual.CONVERTER(options.dataViews[0], this.host);

        let cardText = this.target.append('p');
        if (cardData.length) {
            cardText.text(cardData[0].Fields ? cardData[0].Fields.toString() : '');
        }
        else {
            cardText.text('');
        }

        this.events.renderingFinished(options);
    }



    // converter to table data
    public static CONVERTER(dataView: DataView, host: IVisualHost): CardData[] {
        let resultData: CardData[] = [];
        let tableView = dataView.table;
        let _rows = tableView.rows;
        let _columns = tableView.columns;
        let _fieldsIndex = -1;
        for (let ti = 0; ti < _columns.length; ti++) {
            if (_columns[ti].roles.hasOwnProperty("Fields")) {
                _fieldsIndex = ti;
            }
        }
        for (let i = 0; i < _rows.length; i++) {
            let row = _rows[i];
            let dp = {
                Fields: row[_fieldsIndex] ? row[_fieldsIndex].toString() : null,
            };
            resultData.push(dp);
        }
        return resultData;
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return <VisualSettings>VisualSettings.parse(dataView);
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    }

    private diff_years(dt2, dt1) {
        let diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= (60 * 60 * 24);
        return Math.abs(Math.round(diff / 365.25));
    }
}