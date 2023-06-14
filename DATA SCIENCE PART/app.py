

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import datetime as dt

import dash
from dash import html
from dash import dcc
import plotly.graph_objects as go
from dash.dependencies import Input ,Output
import dash_bootstrap_components as dbc
import plotly_express as px
from plotly.subplots import make_subplots
from dash import dcc, html, callback, Output
import pathlib
import os


def resampledData(data, timeframe) :
    return data.resample(timeframe, origin='start').agg({'AverageTemperature': 'mean','AverageTemperatureUncertainty': 'mean'})

yearData = pd.read_csv("YearlyTemperaturesByCountryWithAlpha3.csv")
yearData = yearData.dropna()
yearData.dt = pd.to_datetime(yearData.dt)
yearData.set_index('dt', inplace=True)

yearData['Year'] = yearData.index.year


YEARS=list(range(1980,2013))





# set the layout for the application----------------------------------------------
app=dash.Dash(external_stylesheets=[dbc.themes.CYBORG],meta_tags=[{'name': 'viewport',
                            'content': 'width=device-width, initial-scale=1.0'}],suppress_callback_exceptions=True)
server=app.server
app.layout=dbc.Container([
                dbc.Row(dbc.Col(html.H1("Global Tempearture Since 1980",className='text-center mb-4', style={'font-family': 'Helvetica Now Display', 'font-weight': 'bold',
                                                            'margin-top': 50, 'text-transform' : 'uppercase', 'letter-spacing': 13, 'font-size': 50}))),
                dbc.Row([dbc.Col([html.H6(['Choose Years to view temperature change :'],  style={'font-family': 'Helvetica Now Display'} ),]),
                                      html.Div(dcc.Slider(id='yearslider',
                                                 marks={str(year):{'label':str(year),'style':{"color": "#7fafdf"},} for year in YEARS},
                                                        step=1
                                                        ,
                                                 min=min(YEARS),
                                                 max=max(YEARS),
                                                 value=2000,
                                                 dots=False,
                                                 disabled=False,
                                                 updatemode='drag',
                                                 included=True,vertical=False,
                                                 verticalHeight=900, className='None',
                                                 tooltip={'always_visible':False, 'placement':'bottom'}),

                                                 style={'width':'90%'})]),
              dbc.Row([dbc.Col([dcc.Graph(id="map",figure={})],xs=12, sm=12, md=12, lg=15, xl=15),dbc.Col(html.Div(id='show_data'),xs=12, sm=12, md=12, lg=5, xl=5)]),
              html.Br(),
              dbc.Row(html.Div(id='marquee'))

              ],fluid=True)






# the call back functions------------------------------------------------------------------------------------------------------------------------------------------------------
@app.callback(
    Output('map','figure'),
    Input('yearslider','value')
)
def update_map(year):
    year_0 =year
    filtered_df=yearData[(yearData.Year==year_0)]
    grouped_df=filtered_df.groupby(['Country','Year','Alpha-3 code'])['AverageTemperature'].mean().reset_index()

    fig1=px.choropleth(
                grouped_df,locations='Alpha-3 code',
                hover_data=['AverageTemperature','Country'],
                color='AverageTemperature',
                hover_name='Country',
                color_continuous_scale=px.colors.sequential.YlOrRd,
                projection='orthographic',
                )
    fig1.update_layout(plot_bgcolor='#060606',paper_bgcolor='#060606', height=700, margin=dict(l=150,r=0,t=50,b=0) ,geo=dict(bgcolor= '#060606'), )
    fig1.layout.template='plotly_dark'
    return fig1



if __name__=='__main__':
    app.run_server(debug=True, port=8050)
