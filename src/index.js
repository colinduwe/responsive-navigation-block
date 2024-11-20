// WordPress dependencies.
import { registerBlockVariation } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import {
	ComboboxControl,
	ToggleControl,
	PanelBody,
	PanelRow,
	Notice,
} from '@wordpress/components';
import { useEntityRecords } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { createInterpolateElement } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Local dependencies.
import './mobile-view-switcher';

// Data inlined from PHP.
const { pluginSlug, classNames } = GETDAVERNB;

const { mobile: mobileClassName, desktop: desktopClassName } = classNames;

registerBlockVariation( 'core/navigation', {
	name: `${ pluginSlug }-desktop`,
	title: __( 'Desktop Navigation', 'getdave-responsive-navigation-block' ),
	description: __(
		'Navigation block preconfigured for larger viewports.',
		'getdave-responsive-navigation-block'
	),
	scope: [ 'block', 'inserter', 'transform' ],
	attributes: {
		overlayMenu: 'never',
		className: desktopClassName,
	},
	isActive( blockAttributes ) {
		return (
			blockAttributes.className?.includes( desktopClassName ) &&
			blockAttributes.overlayMenu === 'never'
		);
	},
} );

registerBlockVariation( 'core/navigation', {
	name: `${ pluginSlug }-mobile`,
	title: __( 'Mobile Navigation', 'getdave-responsive-navigation-block' ),
	description: __(
		'Navigation block preconfigured for smaller viewports.',
		'getdave-responsive-navigation-block'
	),
	scope: [ 'block', 'inserter', 'transform' ],
	attributes: {
		overlayMenu: 'always',
		className: mobileClassName,
	},
	isActive( blockAttributes ) {
		return (
			blockAttributes.className?.includes( mobileClassName ) &&
			blockAttributes.overlayMenu === 'always'
		);
	},
} );

/**
 * Add the attribute to the block.
 * This is the attribute that will be saved to the database.
 *
 * @param {object} settings block settings
 * @param {string} name block name
 * @returns {object} modified settings
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/filters/block-filters/#blocks-registerblocktype
 */
addFilter(
	'blocks.registerBlockType',
	`${ pluginSlug }`,
	function (settings, name) {
		if (name !== 'core/navigation') {
			return settings;
		}

		return {
			...settings,
			attributes: {
				...settings.attributes,
				useTemplatePart: {
					type: 'boolean',
					default: false,
				},
				menuSlug: {
					type: 'string',
					default: '',
				},
			},
		};
	}
);

/**
 * Edit component for the block.
 *
 * @param {object} props block props
 * @returns {JSX}
 */
function Edit(props) {
	const setUseTemplatePart = (value) => {
		props.setAttributes({ useTemplatePart: value });
	};

	const setMenuSlug = (value) => {
		props.setAttributes({ menuSlug: value });
	};

	// Bail if this is not a Mobile Navigation variation
	if( ! ( props.attributes.className?.includes( mobileClassName ) &&
			props.attributes.overlayMenu === 'always' ) ) {
		return;
	}
	const menuSlug = props.attributes.menuSlug;
	// Get the Url for the template part screen in the Site Editor.
	const siteUrl = useSelect( ( select ) => select( 'core' ).getSite()?.url );
	const menuTemplateUrl = siteUrl
		? siteUrl +
		  '/wp-admin/site-editor.php?path=%2Fpatterns&categoryType=wp_template_part&categoryId=menu'
		: '';

	// Fetch all template parts.
	const { hasResolved, records } = useEntityRecords(
		'postType',
		'wp_template_part',
		{
			per_page: -1,
		}
	);

	let menuOptions = [];

	// Filter the template parts for those in the 'menu' area.
	if ( hasResolved ) {
		menuOptions = records
			.filter( ( item ) => item.area === 'menu' )
			.map( ( item ) => ( {
				label: item.title.rendered,
				value: item.slug,
			} ) );
	}

	const hasMenus = menuOptions.length > 0;
	const selectedMenuAndExists = menuSlug
		? menuOptions.some( ( option ) => option.value === menuSlug )
		: true;

	// Notice for when no menus have been created.
	const noMenusNotice = (
		<Notice status="warning" isDismissible={ false }>
			{ createInterpolateElement(
				__(
					'No menu templates could be found. Create a new one in the <a>Site Editor</a>.',
					'getdave-responsive-navigation-block'
				),
				{
					a: (
						<a // eslint-disable-line
							href={ menuTemplateUrl }
							target="_blank"
							rel="noreferrer"
						/>
					),
				}
			) }
		</Notice>
	);

	// Notice for when the selected menu template no longer exists.
	const menuDoesntExistNotice = (
		<Notice status="warning" isDismissible={ false }>
			{ __(
				'The selected menu template no longer exists. Choose another.',
				'getdave-responsive-navigation-block'
			) }
		</Notice>
	);

	return (
		<InspectorControls group='list'>
			<PanelBody title={__('Display Type')}>
				<PanelRow>
					<ToggleControl
					__nextHasNoMarginBottom
					label='Display A Template'
					help={
						props.attributes.useTemplatePart
							? 'Display a template part.'
							: 'Display a menu'
					}
					checked={ props.attributes.useTemplatePart }
					onChange={ (value) => setUseTemplatePart( value ) }
					className='foo-use-template-part'
					/>
				</PanelRow>
				{ props.attributes.useTemplatePart && (
					<>
					<PanelRow>
						<ComboboxControl
							label={ __( 'Menu Template', 'getdave-responsive-navigation-block' ) }
							value={ menuSlug }
							options={ menuOptions }
							onChange={ ( value ) =>
								props.setAttributes( { menuSlug: value } )
							}
							help={
								hasMenus &&
								createInterpolateElement(
									__(
										'Create and modify menu templates in the <a>Site Editor</a>.',
										'getdave-responsive-navigation-block'
									),
									{
										a: (
										<a // eslint-disable-line
												href={ menuTemplateUrl }
												target="_blank"
												rel="noreferrer"
											/>
										),
									}
								)
							}
						/>
					</PanelRow>
					<PanelRow>
						{ ! hasMenus && noMenusNotice }
						{ hasMenus &&
							! selectedMenuAndExists &&
							menuDoesntExistNotice }
					</PanelRow>
					</>
				) }
			</PanelBody>
		</InspectorControls>
	);
}

/**
 * Add the edit component to the block.
 * This is the component that will be rendered in the editor.
 * It will be rendered after the original block edit component.
 *
 * @param {function} BlockEdit Original component
 * @returns {function} Wrapped component
 *
 * @see https://developer.wordpress.org/block-editor/developers/filters/block-filters/#editor-blockedit
 */
addFilter(
	'editor.BlockEdit',
	`${ pluginSlug }`,
	createHigherOrderComponent((BlockEdit) => {
		return (props) => {
			if (props.name !== 'core/navigation') {
				return <BlockEdit {...props} />;
			}

			return (
				<>
					<Edit {...props} />
					<BlockEdit {...props} />
					
				</>
			);
		};
	})
);