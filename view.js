"use strict";

function view_pcb(pcb_data, scale, margin)
{
	//Width and height etc
	var width = pcb_data['dims'][0];
	var heigth = pcb_data['dims'][1];
	var depth = pcb_data['dims'][2];

	var path_func = d3.line()
		.x(function(d) { return d[0]; })
		.y(function(d) { return d[1]; });

	//create/replace SVG element
	var body = d3.select("body");
	var svg = body.select("svg");
	if (svg) svg.remove();
	svg = body.append("svg")
		.attr("width", margin * scale * 2 + width * scale)
		.attr("height", margin * scale * 2 + heigth * scale);
	svg.append("rect")
		.attr("width", margin * scale * 2 + width * scale)
		.attr("height", margin * scale * 2 + heigth * scale)
		.attr("fill", "black");
	var pcb = svg.append("g")
		.attr("transform", "scale(" + scale + "," + scale + ") translate(" + margin + "," + margin + ")")
		.attr("stroke-linecap", "round")
		.attr("stroke-linejoin", "round")
		.attr("stroke-width", "0")
		.attr("fill", "none");

	//create layers, last layer is the terminals layer
	var layers = [];
	var layer_colors = ["red", "green", "blue", "yellow", "cyan", "magenta"];
	for (let layer = 0; layer < depth; ++layer)
	{
		layers.push(pcb.append("g")
			.attr("stroke", layer_colors[layer % layer_colors.length])
			.attr("stroke-opacity", 0.75));
	}
	layers.push(pcb.append("g")
		.attr("stroke", "white"));

	//add tracks
	pcb_data['tracks'].forEach(function(track)
	{
		var track_radius = track[0];
		var paths = track[4];
		paths.forEach(function(path)
		{
			var start = 0;
			var d = path[start][2];
			for (let node = 1; node < path.length; ++node)
			{
				if (path[node][2] === d) continue;
				if (node - start > 1)
				{
					layers[d].append("path")
						.attr("stroke-width", track_radius * 2)
						.attr("d", path_func(path.slice(start, node)));
				}
				start = node;
				d = path[start][2];
			}
			if (node - start > 1)
			{
				layers[d].append("path")
					.attr("stroke-width", track_radius * 2)
					.attr("d", path_func(path.slice(start, node)));
			}
		});
	});

	//add terminals and vias
	pcb_data['tracks'].forEach(function(track)
	{
		var track_radius = track[0];
		var via_radius = track[1];
		var track_gap = track[2];
		var terminals = track[3];
		var paths = track[4];
		terminals.forEach(function(terminal)
		{
			var terminal_radius = terminal[0];
			var terminal_gap = terminal[1];
			var terminal_x = terminal[2][0];
			var terminal_y = terminal[2][1];
			var terminal_z = terminal[2][2];
			var terminal_shape = terminal[3];
			if (!terminal_shape.length)
			{
				layers[layers.length-1].append("circle")
					.attr("cx", terminal_x)
					.attr("cy", terminal_y)
					.attr("r", terminal_radius)
					.attr("fill", "white");
			}
			else if (terminal_shape.length === 2)
			{
				layers[layers.length-1].append("path")
					.attr("stroke-width", terminal_radius * 2)
					.attr("d", path_func(terminal_shape.map(
						function(e){ return [e[0] + terminal_x, e[1] + terminal_y]; })));
			}
			else
			{
				layers[layers.length-1].append("path")
					.attr("fill", "white")
					.attr("d", path_func(terminal_shape.map(
						function(e){ return [e[0] + terminal_x, e[1] + terminal_y]; })));
			}
		});
		paths.forEach(function(path)
		{
			var terminal_z = path[0][2];
			for (let node = 1; node < path.length; ++node)
			{
				if (terminal_z !== path[node][2])
				{
					layers[layers.length-1].append("circle")
						.attr("cx", path[node][0])
						.attr("cy", path[node][1])
						.attr("r", via_radius)
						.attr("fill", "white");
				}
				terminal_z = path[node][2];
			}
		});
	});
}
